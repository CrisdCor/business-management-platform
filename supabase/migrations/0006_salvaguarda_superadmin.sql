-- Incidente: un usuario perdió su rol de Superadministrador al editar su propio
-- perfil (el reemplazo de roles hace DELETE + INSERT en dos llamadas separadas,
-- sin transacción ni validación de negocio), dejando la aplicación sin ningún
-- Superadministrador y por lo tanto completamente bloqueada para todos.
--
-- Esta migración cierra el hueco en dos frentes:
-- 1) Una función RPC `reemplazar_roles_usuario` que hace el DELETE + INSERT en
--    una sola transacción atómica y rechaza la operación (rollback completo)
--    si el resultado deja al sistema sin ningún Superadministrador activo.
-- 2) Un trigger que impide desactivar (activo = false) al único
--    Superadministrador activo restante.

create or replace function public.reemplazar_roles_usuario(p_usuario_id uuid, p_roles text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.permiso('admin.usuarios', 'actualizar') then
    raise exception 'No autorizado para modificar roles de usuarios.';
  end if;

  delete from public.usuario_roles where usuario_id = p_usuario_id;

  if p_roles is not null and array_length(p_roles, 1) > 0 then
    insert into public.usuario_roles (usuario_id, rol_code)
    select p_usuario_id, r from unnest(p_roles) as r;
  end if;

  if not exists (
    select 1
    from public.usuario_roles ur
    join public.usuarios u on u.id = ur.usuario_id
    where ur.rol_code = 'superadministrador' and u.activo = true
  ) then
    raise exception 'No se puede completar: el sistema debe tener al menos un Superadministrador activo.';
  end if;
end;
$$;

revoke execute on function public.reemplazar_roles_usuario(uuid, text[]) from public, anon;
grant execute on function public.reemplazar_roles_usuario(uuid, text[]) to authenticated;

create or replace function public.usuarios_before_update_activo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.activo = true and new.activo = false then
    if exists (
      select 1 from public.usuario_roles ur where ur.usuario_id = old.id and ur.rol_code = 'superadministrador'
    ) and not exists (
      select 1
      from public.usuario_roles ur
      join public.usuarios u on u.id = ur.usuario_id
      where ur.rol_code = 'superadministrador' and u.activo = true and u.id <> old.id
    ) then
      raise exception 'No se puede desactivar: es el único Superadministrador activo del sistema.';
    end if;
  end if;
  return new;
end;
$$;

create trigger usuarios_before_update_activo
  before update of activo on public.usuarios
  for each row execute function public.usuarios_before_update_activo();

revoke execute on function public.usuarios_before_update_activo() from anon, authenticated, public;
