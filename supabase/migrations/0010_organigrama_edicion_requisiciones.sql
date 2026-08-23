-- Organigrama (supervisor_id) y edición de requisiciones mientras estén
-- pendientes. Ajustes pedidos por el usuario tras usar el módulo:
--   1) Un usuario normal solo debe ver sus propias requisiciones.
--   2) Un supervisor solo debe ver/aprobar las de sus reportes directos
--      (relación persona-a-persona, no el rol "supervisor" en general).
--   3) El dueño (o el Superadministrador) puede editar una requisición
--      mientras siga 'pendiente'; en cuanto se aprueba ya no se puede editar.

-- ------------------------------------------------------------------------
-- Organigrama de un solo nivel (no transitivo): usuarios.supervisor_id.
-- ------------------------------------------------------------------------
alter table public.usuarios
  add column supervisor_id uuid references public.usuarios (id) on delete set null,
  add constraint usuarios_supervisor_no_self check (supervisor_id is null or supervisor_id <> id);

create index idx_usuarios_supervisor on public.usuarios (supervisor_id);

-- ------------------------------------------------------------------------
-- Helper reutilizable en las políticas de requisiciones/requisicion_items:
-- ¿el usuario autenticado puede ver una requisición de este solicitante?
-- Superadmin ve todo; el propio dueño se ve a sí mismo; un supervisor ve a
-- sus reportes directos (usuarios.supervisor_id = auth.uid()).
-- ------------------------------------------------------------------------
create or replace function public.puede_ver_requisicion(p_solicitante_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_superadmin()
    or p_solicitante_id = auth.uid()
    or (
      public.has_role('supervisor')
      and exists (
        select 1 from public.usuarios u
        where u.id = p_solicitante_id and u.supervisor_id = auth.uid()
      )
    );
$$;

revoke execute on function public.puede_ver_requisicion(uuid) from public, anon;
grant execute on function public.puede_ver_requisicion(uuid) to authenticated;

-- ------------------------------------------------------------------------
-- RLS: requisiciones/requisicion_items. Se une con OR a
-- permiso('compras.compras','leer') porque el módulo de Compras necesita ver
-- ítems pendientes de cualquier área para poder armar una OC -- sin ese OR,
-- un comprador sin rol supervisor/superadmin quedaría ciego y el módulo de
-- Compras dejaría de funcionar.
-- ------------------------------------------------------------------------
drop policy if exists "requisiciones: lectura compras.requisiciones" on public.requisiciones;
create policy "requisiciones: lectura propia/supervisada/compras" on public.requisiciones
  for select to authenticated
  using (
    (public.permiso('compras.requisiciones', 'leer') and public.puede_ver_requisicion(solicitante_id))
    or public.permiso('compras.compras', 'leer')
  );

drop policy if exists "requisicion_items: lectura compras.requisiciones" on public.requisicion_items;
create policy "requisicion_items: lectura propia/supervisada/compras" on public.requisicion_items
  for select to authenticated
  using (
    exists (
      select 1 from public.requisiciones r
      where r.id = requisicion_items.requisicion_id
        and (
          (public.permiso('compras.requisiciones', 'leer') and public.puede_ver_requisicion(r.solicitante_id))
          or public.permiso('compras.compras', 'leer')
        )
    )
  );

-- ------------------------------------------------------------------------
-- aprobar_requisicion: exige coincidencia exacta de organigrama, ya no basta
-- el rol "supervisor" en general. Sin supervisor_id asignado -> solo
-- Superadministrador. rechazar_requisicion NO cambia (sigue exclusiva de
-- is_superadmin(), 0007).
-- ------------------------------------------------------------------------
create or replace function public.aprobar_requisicion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitante uuid;
  v_solicitante_supervisor uuid;
  v_folio text;
  v_estado text;
begin
  select r.solicitante_id, r.folio, r.estado, u.supervisor_id
  into v_solicitante, v_folio, v_estado, v_solicitante_supervisor
  from public.requisiciones r
  join public.usuarios u on u.id = r.solicitante_id
  where r.id = p_id;

  if v_solicitante is null then
    raise exception 'Requisición no encontrada.';
  end if;

  if not (
    public.is_superadmin()
    or (public.has_role('supervisor') and v_solicitante_supervisor is not null and v_solicitante_supervisor = auth.uid())
  ) then
    raise exception 'No autorizado para aprobar esta requisición.';
  end if;

  if v_estado <> 'pendiente' then
    raise exception 'Solo se pueden aprobar requisiciones pendientes.';
  end if;

  update public.requisiciones
  set estado = 'aprobada', aprobador_id = auth.uid(), fecha_aprobacion = now(), motivo_rechazo = null
  where id = p_id;

  insert into public.notificaciones (usuario_id, titulo, mensaje, entidad_tipo, entidad_id)
  values (v_solicitante, 'Requisición aprobada', 'Tu requisición ' || v_folio || ' fue aprobada.', 'requisicion', p_id);
end;
$$;

revoke execute on function public.aprobar_requisicion(uuid) from public, anon;
grant execute on function public.aprobar_requisicion(uuid) to authenticated;

-- ------------------------------------------------------------------------
-- editar_requisicion: el dueño o el Superadministrador, solo mientras
-- 'pendiente'. Reemplaza descripcion + el set completo de ítems
-- (delete+insert), reutilizando el trigger `requisicion_items_before_insert`
-- para el snapshot de rubro/unidad -- mismo patrón que `crear_requisicion`.
-- Es seguro porque un ítem de una requisición 'pendiente' nunca tiene
-- compra_items asociados (eso solo puede ocurrir desde 'aprobada'/'en_compra').
-- ------------------------------------------------------------------------
create or replace function public.editar_requisicion(p_id uuid, p_items jsonb, p_descripcion text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitante uuid;
  v_estado text;
  v_item jsonb;
begin
  select solicitante_id, estado into v_solicitante, v_estado
  from public.requisiciones where id = p_id;

  if v_solicitante is null then
    raise exception 'Requisición no encontrada.';
  end if;
  if not (v_solicitante = auth.uid() or public.is_superadmin()) then
    raise exception 'No autorizado para editar esta requisición.';
  end if;
  if v_estado <> 'pendiente' then
    raise exception 'Solo se pueden editar requisiciones pendientes.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La requisición debe tener al menos un ítem.';
  end if;

  update public.requisiciones set descripcion = p_descripcion where id = p_id;
  delete from public.requisicion_items where requisicion_id = p_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.requisicion_items (requisicion_id, producto_id, cantidad, observacion)
    values (p_id, (v_item->>'producto_id')::uuid, (v_item->>'cantidad')::numeric, nullif(v_item->>'observacion', ''));
  end loop;
end;
$$;

revoke execute on function public.editar_requisicion(uuid, jsonb, text) from public, anon;
grant execute on function public.editar_requisicion(uuid, jsonb, text) to authenticated;
