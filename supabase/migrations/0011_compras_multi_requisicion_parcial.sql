-- Compras multi-requisición y compra parcial de cantidad. Ajustes pedidos
-- por el usuario tras usar el módulo:
--   a) Una OC puede agrupar ítems de varias requisiciones, siempre que
--      compartan área y ciudad de operación (misma cuenta de cobro / centro
--      de costos). Se quita compras.requisicion_id: la pertenencia se deriva
--      vía compra_items.requisicion_item_id -> requisicion_items.requisicion_id.
--   b) Compra parcial: se puede comprar solo una parte de la cantidad pedida
--      de un ítem. compra_items gana su propia `cantidad`; se quita el
--      UNIQUE que impedía que un ítem apareciera en más de una OC.
--   c) El comprador puede anular el saldo pendiente de un ítem (no
--      comprarlo) dando un motivo obligatorio.
--   d) Una compra sigue teniendo un solo proveedor (compras.proveedor_id,
--      sin cambios) -- ya cumplía este requisito.
-- La requisición se cierra sola cuando a NINGÚN ítem le queda saldo
-- pendiente (comprado + anulado = cantidad pedida).
-- compras/compra_items siguen en 0 filas en producción; requisicion_items
-- tiene 2 filas, ambas con comprado=false (verificado antes de aplicar) --
-- se altera el esquema sin necesidad de migrar datos.

-- ------------------------------------------------------------------------
-- compras: ya no referencia una sola requisición.
-- ------------------------------------------------------------------------
alter table public.compras drop column requisicion_id;

-- ------------------------------------------------------------------------
-- compra_items: el mismo ítem puede aparecer en varias OC a lo largo del
-- tiempo (compra parcial); cantidad propia de esta OC, independiente de la
-- cantidad pedida en requisicion_items.
-- ------------------------------------------------------------------------
alter table public.compra_items
  drop constraint if exists compra_items_requisicion_item_id_key,
  add column cantidad numeric(14, 2) not null check (cantidad > 0);

-- ------------------------------------------------------------------------
-- requisicion_items: tracking de cantidades en vez del booleano `comprado`.
-- ------------------------------------------------------------------------
alter table public.requisicion_items
  drop column comprado,
  add column cantidad_comprada numeric(14, 2) not null default 0 check (cantidad_comprada >= 0),
  add column cantidad_anulada numeric(14, 2) not null default 0 check (cantidad_anulada >= 0),
  add column motivo_anulacion text;

alter table public.requisicion_items
  add column cantidad_pendiente numeric(14, 2) generated always as (cantidad - cantidad_comprada - cantidad_anulada) stored,
  add constraint requisicion_items_comprada_anulada_check check (cantidad_comprada + cantidad_anulada <= cantidad);

create index idx_requisicion_items_pendiente on public.requisicion_items (requisicion_id) where cantidad_pendiente > 0;

-- ------------------------------------------------------------------------
-- Recalcula el estado de una requisición según el saldo pendiente de sus
-- ítems. Uso interno exclusivo de otras funciones security definer: no
-- valida autorización propia (confía en quien la invoca), por eso se revoca
-- también de `authenticated` -- igual que las funciones-trigger de 0002/0008.
-- ------------------------------------------------------------------------
create or replace function public.actualizar_estado_requisicion(p_requisicion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_pendientes int;
  v_tocados int;
begin
  select estado into v_estado from public.requisiciones where id = p_requisicion_id;
  if v_estado not in ('aprobada', 'en_compra') then
    return;
  end if;

  select
    count(*) filter (where cantidad_pendiente > 0),
    count(*) filter (where cantidad_comprada > 0 or cantidad_anulada > 0)
  into v_pendientes, v_tocados
  from public.requisicion_items where requisicion_id = p_requisicion_id;

  if v_pendientes = 0 then
    update public.requisiciones set estado = 'cerrada' where id = p_requisicion_id;
  elsif v_tocados > 0 and v_estado = 'aprobada' then
    update public.requisiciones set estado = 'en_compra' where id = p_requisicion_id;
  end if;
end;
$$;

revoke execute on function public.actualizar_estado_requisicion(uuid) from anon, authenticated, public;

-- ------------------------------------------------------------------------
-- registrar_compra_oc: reescritura completa. Ya no recibe p_requisicion_id.
-- Por cada ítem: bloquea la fila (`for update of ri`, serializa compras
-- concurrentes sobre el mismo ítem), valida que su requisición esté
-- aprobada/en_compra y que la cantidad pedida en esta OC <= cantidad
-- pendiente actual; exige que TODAS las requisiciones tocadas compartan área
-- y ciudad. Agrupa por rubro para el presupuesto (área común derivada, en
-- vez de la de una sola requisición). Al final recalcula el estado de cada
-- requisición afectada.
-- ------------------------------------------------------------------------
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
    where rubro_id = rubro.rubro_id and area_id = v_area_id and anio = v_anio and mes = v_mes;
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
      where rubro_id = rubro.rubro_id and area_id = v_area_id and anio = v_anio and mes = v_mes;
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

-- ------------------------------------------------------------------------
-- aprobar_exceso_compra_oc: el área ya no viene de compras.requisicion_id
-- (columna eliminada); se deriva de cualquiera de los requisicion_items de
-- la compra (comparten área por construcción). El descuento usa
-- compra_items.cantidad (lo realmente comprado en ESTA OC), no
-- requisicion_items.cantidad -- clave para la compra parcial.
-- ------------------------------------------------------------------------
create or replace function public.aprobar_exceso_compra_oc(p_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area_id uuid;
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

  select r.area_id into v_area_id
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
    where rubro_id = rubro.rubro_id and area_id = v_area_id and anio = v_anio and mes = v_mes;
  end loop;

  update public.compras set estado = 'en_proceso', aprobado_superadmin_id = auth.uid() where id = p_compra_id;
end;
$$;

revoke execute on function public.aprobar_exceso_compra_oc(uuid) from public, anon;
grant execute on function public.aprobar_exceso_compra_oc(uuid) to authenticated;

-- ------------------------------------------------------------------------
-- anular_saldo_requisicion_item: anula EXACTAMENTE todo el saldo pendiente
-- restante (no un monto parcial arbitrario), con motivo obligatorio. `for
-- update` serializa contra una registrar_compra_oc concurrente sobre el
-- mismo ítem. Dispara el recálculo de estado de la requisición (puede pasar
-- directo de 'aprobada' a 'cerrada' si nunca se compró nada de ese ítem).
-- ------------------------------------------------------------------------
create or replace function public.anular_saldo_requisicion_item(p_requisicion_item_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requisicion_id uuid;
  v_cantidad_pendiente numeric(14, 2);
begin
  if not public.permiso('compras.compras', 'actualizar') then
    raise exception 'No autorizado para anular el saldo de este ítem.';
  end if;
  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Debes indicar el motivo de la anulación.';
  end if;

  select requisicion_id, cantidad_pendiente into v_requisicion_id, v_cantidad_pendiente
  from public.requisicion_items where id = p_requisicion_item_id
  for update;

  if v_requisicion_id is null then
    raise exception 'Ítem de requisición no encontrado.';
  end if;
  if v_cantidad_pendiente <= 0 then
    raise exception 'Este ítem no tiene saldo pendiente por anular.';
  end if;

  update public.requisicion_items
  set cantidad_anulada = cantidad_anulada + v_cantidad_pendiente, motivo_anulacion = p_motivo
  where id = p_requisicion_item_id;

  perform public.actualizar_estado_requisicion(v_requisicion_id);
end;
$$;

revoke execute on function public.anular_saldo_requisicion_item(uuid, text) from public, anon;
grant execute on function public.anular_saldo_requisicion_item(uuid, text) to authenticated;
