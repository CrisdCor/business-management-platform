-- ----------------------------------------------------------------------------
-- Presupuestos: se asignan por rubro + área + ciudad de operación (antes solo
-- rubro + área). `presupuestos` está vacía en producción (0 filas) al momento
-- de esta migración, así que la columna se agrega NOT NULL directamente, sin
-- necesidad de backfill.
-- ----------------------------------------------------------------------------
alter table public.presupuestos
  add column ciudad_operacion_id uuid not null references public.ciudades_operacion (id);

alter table public.presupuestos
  drop constraint presupuestos_rubro_id_area_id_anio_mes_key,
  add constraint presupuestos_rubro_area_ciudad_periodo_key
    unique (rubro_id, area_id, ciudad_operacion_id, anio, mes);

create index idx_presupuestos_ciudad on public.presupuestos (ciudad_operacion_id);

-- registrar_compra_oc: el saldo disponible ahora se busca también por
-- ciudad_operacion_id (v_ciudad_id ya se calculaba antes para validar que
-- todos los ítems compartieran ciudad, pero no se usaba en la búsqueda del
-- presupuesto).
create or replace function public.registrar_compra_oc(
  p_proveedor_id uuid,
  p_items jsonb, -- [{requisicion_item_id, cantidad, precio_unitario}, ...]
  p_fecha_entrega_estimada timestamptz default null,
  p_notas text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra_id uuid;
  v_area_id uuid;
  v_ciudad_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_precio numeric(14, 2);
  v_cantidad numeric(14, 2);
  v_cantidad_pendiente numeric(14, 2);
  v_req_id uuid;
  v_req_estado text;
  v_req_area uuid;
  v_req_ciudad uuid;
  v_monto_total numeric(14, 2) := 0;
  v_excede boolean := false;
  v_anio int := extract(year from now())::int;
  v_mes int := extract(month from now())::int;
  v_requisiciones_afectadas uuid[] := '{}';
  v_req_id_loop uuid;
  v_disponible numeric(14, 2);
  rubro record;
begin
  if not public.permiso('compras.compras', 'crear') then
    raise exception 'No autorizado para registrar compras.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La compra debe incluir al menos un ítem.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item->>'requisicion_item_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio := (v_item->>'precio_unitario')::numeric;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad de cada ítem debe ser mayor a cero.';
    end if;
    if v_precio is null or v_precio < 0 then
      raise exception 'Precio unitario inválido.';
    end if;

    select ri.requisicion_id, ri.cantidad_pendiente, r.estado, r.area_id, r.ciudad_operacion_id
    into v_req_id, v_cantidad_pendiente, v_req_estado, v_req_area, v_req_ciudad
    from public.requisicion_items ri
    join public.requisiciones r on r.id = ri.requisicion_id
    where ri.id = v_item_id
    for update of ri;

    if v_req_id is null then
      raise exception 'Uno de los ítems no existe.';
    end if;
    if v_req_estado not in ('aprobada', 'en_compra') then
      raise exception 'Uno de los ítems pertenece a una requisición que no está aprobada ni en gestión de compra.';
    end if;
    if v_cantidad > v_cantidad_pendiente then
      raise exception 'La cantidad solicitada de un ítem supera su saldo pendiente.';
    end if;

    if v_area_id is null then
      v_area_id := v_req_area;
      v_ciudad_id := v_req_ciudad;
    elsif v_area_id <> v_req_area or v_ciudad_id is distinct from v_req_ciudad then
      raise exception 'Todos los ítems de una misma compra deben pertenecer a requisiciones de la misma área y ciudad de operación.';
    end if;

    v_monto_total := v_monto_total + (v_cantidad * v_precio);
    if not (v_req_id = any(v_requisiciones_afectadas)) then
      v_requisiciones_afectadas := array_append(v_requisiciones_afectadas, v_req_id);
    end if;
  end loop;

  for rubro in
    select ri.rubro_id as rubro_id, sum((elem->>'cantidad')::numeric * (elem->>'precio_unitario')::numeric) as subtotal
    from jsonb_array_elements(p_items) elem
    join public.requisicion_items ri on ri.id = (elem->>'requisicion_item_id')::uuid
    group by ri.rubro_id
  loop
    select (monto_asignado - monto_consumido) into v_disponible
    from public.presupuestos
    where rubro_id = rubro.rubro_id and area_id = v_area_id and ciudad_operacion_id = v_ciudad_id
      and anio = v_anio and mes = v_mes;
    if rubro.subtotal > coalesce(v_disponible, 0) then
      v_excede := true;
    end if;
  end loop;

  insert into public.compras (folio_oc, proveedor_id, monto_total, excede_presupuesto, estado, fecha_entrega_estimada, notas)
  values (
    'OC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.compra_folio_seq')::text, 4, '0'),
    p_proveedor_id, v_monto_total, v_excede,
    case when v_excede then 'pendiente_aprobacion_exceso' else 'en_proceso' end,
    p_fecha_entrega_estimada, p_notas
  )
  returning id into v_compra_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.compra_items (compra_id, requisicion_item_id, cantidad, precio_unitario)
    values (v_compra_id, (v_item->>'requisicion_item_id')::uuid, (v_item->>'cantidad')::numeric, (v_item->>'precio_unitario')::numeric);

    update public.requisicion_items
    set cantidad_comprada = cantidad_comprada + (v_item->>'cantidad')::numeric
    where id = (v_item->>'requisicion_item_id')::uuid;
  end loop;

  if not v_excede then
    for rubro in
      select ri.rubro_id as rubro_id, sum((elem->>'cantidad')::numeric * (elem->>'precio_unitario')::numeric) as subtotal
      from jsonb_array_elements(p_items) elem
      join public.requisicion_items ri on ri.id = (elem->>'requisicion_item_id')::uuid
      group by ri.rubro_id
    loop
      update public.presupuestos
      set monto_consumido = monto_consumido + rubro.subtotal
      where rubro_id = rubro.rubro_id and area_id = v_area_id and ciudad_operacion_id = v_ciudad_id
        and anio = v_anio and mes = v_mes;
    end loop;
  end if;

  foreach v_req_id_loop in array v_requisiciones_afectadas loop
    perform public.actualizar_estado_requisicion(v_req_id_loop);
  end loop;

  return v_compra_id;
end;
$$;

revoke execute on function public.registrar_compra_oc(uuid, jsonb, timestamptz, text) from public, anon;
grant execute on function public.registrar_compra_oc(uuid, jsonb, timestamptz, text) to authenticated;

-- aprobar_exceso_compra_oc: ahora también deriva la ciudad de operación
-- (antes solo el área) para descontar del presupuesto correcto.
create or replace function public.aprobar_exceso_compra_oc(p_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area_id uuid;
  v_ciudad_id uuid;
  v_estado text;
  v_anio int := extract(year from now())::int;
  v_mes int := extract(month from now())::int;
  rubro record;
begin
  if not public.is_superadmin() then
    raise exception 'Solo un Superadministrador puede aprobar el exceso de presupuesto.';
  end if;

  select estado into v_estado from public.compras where id = p_compra_id;
  if v_estado is null then
    raise exception 'Compra no encontrada.';
  end if;
  if v_estado <> 'pendiente_aprobacion_exceso' then
    raise exception 'Esta compra no está pendiente de aprobación por exceso de presupuesto.';
  end if;

  select r.area_id, r.ciudad_operacion_id into v_area_id, v_ciudad_id
  from public.compra_items ci
  join public.requisicion_items ri on ri.id = ci.requisicion_item_id
  join public.requisiciones r on r.id = ri.requisicion_id
  where ci.compra_id = p_compra_id
  limit 1;

  if v_area_id is null then
    raise exception 'No se pudo determinar el área de esta compra.';
  end if;

  for rubro in
    select ri.rubro_id as rubro_id, sum(ci.cantidad * ci.precio_unitario) as subtotal
    from public.compra_items ci
    join public.requisicion_items ri on ri.id = ci.requisicion_item_id
    where ci.compra_id = p_compra_id
    group by ri.rubro_id
  loop
    update public.presupuestos
    set monto_consumido = monto_consumido + rubro.subtotal
    where rubro_id = rubro.rubro_id and area_id = v_area_id and ciudad_operacion_id = v_ciudad_id
      and anio = v_anio and mes = v_mes;
  end loop;

  update public.compras set estado = 'en_proceso', aprobado_superadmin_id = auth.uid() where id = p_compra_id;
end;
$$;

revoke execute on function public.aprobar_exceso_compra_oc(uuid) from public, anon;
grant execute on function public.aprobar_exceso_compra_oc(uuid) to authenticated;
