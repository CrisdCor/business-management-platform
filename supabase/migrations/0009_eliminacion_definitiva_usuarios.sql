-- Anulación (borrado completo) de usuarios sin movimientos, exclusiva del
-- Superadministrador. "Movimientos" = haber solicitado o aprobado una
-- requisición, o haber aprobado un exceso de presupuesto en una compra. Un
-- usuario con al menos uno de esos rastros NO puede eliminarse (se preserva
-- la trazabilidad histórica); solo se permite el borrado duro de cuentas que
-- nunca tocaron el flujo transaccional.
--
-- Mismo patrón atómico ya usado en `reemplazar_roles_usuario` (0006) y las
-- RPC de requisiciones/compras (0007): la función valida autorización e
-- invariantes de negocio server-side, en vez de confiar en checks dispersos
-- del cliente.
--
-- El borrado de `public.usuarios` (aquí) cae en cascada sobre
-- `usuario_roles`, `usuario_permisos` y `notificaciones` (ya son
-- `on delete cascade`). El borrado de la cuenta de `auth.users` —incluyendo
-- sesiones/identidades internas de Supabase Auth— se hace aparte desde la
-- capa de aplicación con la Admin API (`auth.admin.deleteUser`), ya que eso
-- no es una operación de SQL plano.

create or replace function public.eliminar_usuario_definitivo(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Solo un Superadministrador puede eliminar usuarios.';
  end if;

  if p_usuario_id = auth.uid() then
    raise exception 'No puedes eliminar tu propio usuario.';
  end if;

  if not exists (select 1 from public.usuarios where id = p_usuario_id) then
    raise exception 'El usuario no existe o ya fue eliminado.';
  end if;

  if exists (
    select 1 from public.requisiciones
    where solicitante_id = p_usuario_id or aprobador_id = p_usuario_id
  ) or exists (
    select 1 from public.compras where aprobado_superadmin_id = p_usuario_id
  ) then
    raise exception 'Este usuario tiene movimientos registrados (requisiciones o compras) y no puede eliminarse.';
  end if;

  if exists (
    select 1 from public.usuario_roles where usuario_id = p_usuario_id and rol_code = 'superadministrador'
  ) and not exists (
    select 1
    from public.usuario_roles ur
    where ur.rol_code = 'superadministrador' and ur.usuario_id <> p_usuario_id
  ) then
    raise exception 'No se puede eliminar: es el único Superadministrador del sistema.';
  end if;

  delete from public.usuarios where id = p_usuario_id;
end;
$$;

revoke execute on function public.eliminar_usuario_definitivo(uuid) from public, anon;
grant execute on function public.eliminar_usuario_definitivo(uuid) to authenticated;
