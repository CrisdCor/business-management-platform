-- =========================================================================
-- 0007_requisiciones_itemizadas.sql
-- Rediseño de Requisiciones/Compras a un modelo por ítems (producto +
-- cantidad + observación), con catálogo de productos/unidades de medida,
-- semáforo de vencimiento, aprobación/rechazo con reglas de rol, notificaciones
-- dentro de la app y compras parciales (una requisición -> N órdenes de
-- compra). Las tablas afectadas están vacías en producción: se altera el
-- esquema directamente, sin migración de datos.
--
-- Todo cambio de estado (crear/aprobar/rechazar requisición, registrar
-- compra, aprobar exceso de presupuesto) pasa por funciones RPC
-- `security definer` que validan el rol exacto en una sola transacción
-- atómica -- mismo patrón que `reemplazar_roles_usuario` (0006), adoptado
-- tras el incidente de esa migración: la matriz de permisos genérica no basta
-- para invariantes de negocio que dependen de un rol concreto.
-- =========================================================================

-- ------------------------------------------------------------------------
-- Catálogos nuevos: unidades de medida y productos
-- ------------------------------------------------------------------------
create table public.unidades_medida (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  abreviatura text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger unidades_medida_set_updated_at
  before update on public.unidades_medida for each row execute function public.set_updated_at();

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  rubro_id uuid not null references public.rubros (id),
  unidad_medida_id uuid not null references public.unidades_medida (id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger productos_set_updated_at
  before update on public.productos for each row execute function public.set_updated_at();

create index idx_productos_rubro on public.productos (rubro_id);
create index idx_productos_unidad_medida on public.productos (unidad_medida_id);

insert into public.modulos (code, label) values
  ('compras.productos', 'Productos'),
  ('compras.unidades_medida', 'Unidades de medida');

alter table public.unidades_medida enable row level security;
create policy "unidades_medida: lectura autenticados" on public.unidades_medida
  for select using (true);
create policy "unidades_medida: insertar compras.unidades_medida" on public.unidades_medida
  for insert with check (public.permiso('compras.unidades_medida', 'crear'));
create policy "unidades_medida: actualizar compras.unidades_medida" on public.unidades_medida
  for update using (public.permiso('compras.unidades_medida', 'actualizar')) with check (public.permiso('compras.unidades_medida', 'actualizar'));
create policy "unidades_medida: eliminar compras.unidades_medida" on public.unidades_medida
  for delete using (public.permiso('compras.unidades_medida', 'eliminar'));

alter table public.productos enable row level security;
create policy "productos: lectura autenticados" on public.productos
  for select using (true);
create policy "productos: insertar compras.productos" on public.productos
  for insert with check (public.permiso('compras.productos', 'crear'));
create policy "productos: actualizar compras.productos" on public.productos
  for update using (public.permiso('compras.productos', 'actualizar')) with check (public.permiso('compras.productos', 'actualizar'));
create policy "productos: eliminar compras.productos" on public.productos
  for delete using (public.permiso('compras.productos', 'eliminar'));

-- ------------------------------------------------------------------------
-- Requisiciones: pasan a ser un encabezado sin rubro/presupuesto/monto
-- (eso ahora vive por ítem); área y ciudad de operación ya no las envía el
-- cliente -- las fija el trigger desde el perfil del solicitante.
-- ------------------------------------------------------------------------
alter table public.requisiciones
  drop column rubro_id,
  drop column presupuesto_id,
  drop column monto_estimado,
  alter column descripcion drop not null,
  add column ciudad_operacion_id uuid references public.ciudades_operacion (id);

create or replace function public.requisiciones_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area_id uuid;
  v_ciudad_id uuid;
begin
  if new.solicitante_id is null then
    new.solicitante_id := auth.uid();
  end if;

  -- Área y ciudad de operación: siempre las del perfil del solicitante, nunca
  -- lo que envíe el cliente (defensa en profundidad, no solo deshabilitar el
  -- campo en el formulario).
  select area_id, ciudad_operacion_id into v_area_id, v_ciudad_id
  from public.usuarios where id = new.solicitante_id;

  new.area_id := v_area_id;
  new.ciudad_operacion_id := v_ciudad_id;

  if new.folio is null then
    new.folio := 'REQ-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.requisicion_folio_seq')::text, 4, '0');
  end if;

  if public.has_role('supervisor') or public.is_superadmin() then
    new.estado := 'aprobada';
    new.aprobador_id := coalesce(new.aprobador_id, auth.uid());
    new.fecha_aprobacion := coalesce(new.fecha_aprobacion, now());
  else
    new.estado := 'pendiente';
    new.aprobador_id := null;
    new.fecha_aprobacion := null;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------------------
-- Ítems de requisición: producto + cantidad + observación. Rubro y unidad de
-- medida son un snapshot que copia el trigger desde el catálogo de
-- productos -- el solicitante nunca los captura directamente.
-- ------------------------------------------------------------------------
create table public.requisicion_items (
  id uuid primary key default gen_random_uuid(),
  requisicion_id uuid not null references public.requisiciones (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  rubro_id uuid not null references public.rubros (id),
  unidad_medida_id uuid not null references public.unidades_medida (id),
  cantidad numeric(14, 2) not null check (cantidad > 0),
  observacion text,
  comprado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger requisicion_items_set_updated_at
  before update on public.requisicion_items for each row execute function public.set_updated_at();

create or replace function public.requisicion_items_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rubro_id uuid;
  v_unidad_id uuid;
begin
  select rubro_id, unidad_medida_id into v_rubro_id, v_unidad_id
  from public.productos where id = new.producto_id and activo = true;

  if v_rubro_id is null then
    raise exception 'Producto no encontrado o inactivo.';
  end if;

  new.rubro_id := v_rubro_id;
  new.unidad_medida_id := v_unidad_id;
  return new;
end;
$$;

create trigger requisicion_items_before_insert
  before insert on public.requisicion_items
  for each row execute function public.requisicion_items_before_insert();

create index idx_requisicion_items_requisicion on public.requisicion_items (requisicion_id);
create index idx_requisicion_items_producto on public.requisicion_items (producto_id);
create index idx_requisicion_items_rubro on public.requisicion_items (rubro_id);

alter table public.requisicion_items enable row level security;
create policy "requisicion_items: lectura compras.requisiciones" on public.requisicion_items
  for select using (public.permiso('compras.requisiciones', 'leer'));
-- Sin políticas de insert/update/delete para clientes: toda mutación pasa por
-- las funciones RPC `security definer` de más abajo, que corren con permisos
-- propios y validan el invariante de negocio antes de escribir.

-- ------------------------------------------------------------------------
-- Compras: una requisición puede tener varias (compra parcial por ítems).
-- `monto` se reemplaza por `monto_total`, calculado por la RPC que registra
-- la compra a partir de sus ítems.
-- ------------------------------------------------------------------------
alter table public.compras
  drop constraint if exists compras_requisicion_id_key,
  drop column monto,
  add column monto_total numeric(14, 2) not null default 0;

drop trigger if exists compras_before_insert on public.compras;
drop function if exists public.compras_before_insert();
drop trigger if exists compras_after_insert on public.compras;
drop function if exists public.compras_after_insert();
drop trigger if exists compras_after_update on public.compras;
drop function if exists public.compras_after_update();

create table public.compra_items (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  requisicion_item_id uuid not null unique references public.requisicion_items (id),
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  created_at timestamptz not null default now()
);

create index idx_compra_items_compra on public.compra_items (compra_id);

alter table public.compra_items enable row level security;
create policy "compra_items: lectura compras.compras" on public.compra_items
  for select using (public.permiso('compras.compras', 'leer'));
-- Igual que requisicion_items: sin insert/update/delete de cliente, todo pasa
-- por `registrar_compra_oc` / `aprobar_exceso_compra_oc`.

-- Todo cambio de estado de una requisición pasa ahora por las RPC de abajo
-- (que corren `security definer` y validan el rol exacto). Se retira la
-- política de UPDATE genérica: dejarla habilitada permitiría, por ejemplo,
-- que cualquiera con `compras.requisiciones:actualizar` reescribiera el
-- estado sin pasar por las reglas de aprobación/rechazo -- la misma clase de
-- hueco que causó el incidente del Superadministrador (0006).
drop policy if exists "requisiciones: actualizar compras.requisiciones" on public.requisiciones;

-- ------------------------------------------------------------------------
-- Notificaciones dentro de la app (sin correo, según lo acordado).
-- ------------------------------------------------------------------------
create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  leida boolean not null default false,
  entidad_tipo text,
  entidad_id uuid,
  created_at timestamptz not null default now()
);

create index idx_notificaciones_usuario on public.notificaciones (usuario_id, leida);

alter table public.notificaciones enable row level security;
create policy "notificaciones: lectura propia" on public.notificaciones
  for select using (usuario_id = (select auth.uid()));
create policy "notificaciones: actualizar propia" on public.notificaciones
  for update using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
-- Sin política de insert para clientes: solo las RPC `security definer`
-- insertan notificaciones (aprobar/rechazar requisición).

-- ------------------------------------------------------------------------
-- RPC: crear_requisicion
-- ------------------------------------------------------------------------
create or replace function public.crear_requisicion(p_items jsonb, p_descripcion text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_item jsonb;
begin
  if not public.permiso('compras.requisiciones', 'crear') then
    raise exception 'No autorizado para crear requisiciones.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La requisición debe tener al menos un ítem.';
  end if;

  insert into public.requisiciones (descripcion) values (p_descripcion)
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.requisicion_items (requisicion_id, producto_id, cantidad, observacion)
    values (
      v_id,
      (v_item->>'producto_id')::uuid,
      (v_item->>'cantidad')::numeric,
      nullif(v_item->>'observacion', '')
    );
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.crear_requisicion(jsonb, text) from public, anon;
grant execute on function public.crear_requisicion(jsonb, text) to authenticated;

-- ------------------------------------------------------------------------
-- RPC: aprobar_requisicion
-- ------------------------------------------------------------------------
create or replace function public.aprobar_requisicion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitante uuid;
  v_folio text;
  v_estado text;
begin
  if not (public.has_role('supervisor') or public.is_superadmin()) then
    raise exception 'No autorizado para aprobar requisiciones.';
  end if;

  select solicitante_id, folio, estado into v_solicitante, v_folio, v_estado
  from public.requisiciones where id = p_id;

  if v_solicitante is null then
    raise exception 'Requisición no encontrada.';
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
-- RPC: rechazar_requisicion (solo Superadministrador, con motivo)
-- ------------------------------------------------------------------------
create or replace function public.rechazar_requisicion(p_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitante uuid;
  v_folio text;
begin
  if not public.is_superadmin() then
    raise exception 'Solo un Superadministrador puede rechazar requisiciones.';
  end if;
  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Debes indicar el motivo del rechazo.';
  end if;

  select solicitante_id, folio into v_solicitante, v_folio
  from public.requisiciones where id = p_id;

  if v_solicitante is null then
    raise exception 'Requisición no encontrada.';
  end if;

  update public.requisiciones
  set estado = 'rechazada', aprobador_id = auth.uid(), motivo_rechazo = p_motivo
  where id = p_id;

  insert into public.notificaciones (usuario_id, titulo, mensaje, entidad_tipo, entidad_id)
  values (
    v_solicitante,
    'Requisición rechazada',
    'Tu requisición ' || v_folio || ' fue rechazada. Motivo: ' || p_motivo,
    'requisicion',
    p_id
  );
end;
$$;

revoke execute on function public.rechazar_requisicion(uuid, text) from public, anon;
grant execute on function public.rechazar_requisicion(uuid, text) to authenticated;

-- ------------------------------------------------------------------------
-- RPC: registrar_compra_oc -- valida pertenencia/disponibilidad de ítems,
-- agrupa por rubro contra el presupuesto vigente del área (mismo periodo
-- mes/año actual, misma fórmula que `Presupuesto.excedeDisponible`), calcula
-- el monto total y deja la compra en `pendiente_aprobacion_exceso` si algún
-- rubro se pasa del disponible.
-- ------------------------------------------------------------------------
create or replace function public.registrar_compra_oc(
  p_requisicion_id uuid,
  p_proveedor_id uuid,
  p_items jsonb,
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
  v_estado_req text;
  v_item jsonb;
  v_item_id uuid;
  v_precio numeric(14, 2);
  v_cantidad numeric(14, 2);
  v_req_item_requisicion uuid;
  v_comprado boolean;
  v_monto_total numeric(14, 2) := 0;
  v_excede boolean := false;
  v_anio int := extract(year from now())::int;
  v_mes int := extract(month from now())::int;
  v_item_ids uuid[] := '{}';
  v_disponible numeric(14, 2);
  rubro record;
begin
  if not public.permiso('compras.compras', 'crear') then
    raise exception 'No autorizado para registrar compras.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La compra debe incluir al menos un ítem.';
  end if;

  select area_id, estado into v_area_id, v_estado_req
  from public.requisiciones where id = p_requisicion_id;

  if v_area_id is null then
    raise exception 'Requisición no encontrada.';
  end if;
  if v_estado_req not in ('aprobada', 'en_compra') then
    raise exception 'Solo se puede comprar sobre requisiciones aprobadas.';
  end if;

  -- Valida pertenencia/disponibilidad de cada ítem y acumula el monto total.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item->>'requisicion_item_id')::uuid;
    v_precio := (v_item->>'precio_unitario')::numeric;

    select requisicion_id, cantidad, comprado into v_req_item_requisicion, v_cantidad, v_comprado
    from public.requisicion_items where id = v_item_id;

    if v_req_item_requisicion is null or v_req_item_requisicion <> p_requisicion_id then
      raise exception 'Uno de los ítems no pertenece a esta requisición.';
    end if;
    if v_comprado then
      raise exception 'Uno de los ítems ya fue incluido en otra compra.';
    end if;
    if v_precio is null or v_precio < 0 then
      raise exception 'Precio unitario inválido.';
    end if;

    v_monto_total := v_monto_total + (v_cantidad * v_precio);
    v_item_ids := array_append(v_item_ids, v_item_id);
  end loop;

  -- Agrupa por rubro (snapshot de cada ítem) y valida contra el presupuesto
  -- vigente del área en el periodo actual.
  for rubro in
    select ri.rubro_id as rubro_id, sum(ri.cantidad * (elem->>'precio_unitario')::numeric) as subtotal
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

  insert into public.compras (
    requisicion_id, folio_oc, proveedor_id, monto_total, excede_presupuesto, estado,
    fecha_entrega_estimada, notas
  ) values (
    p_requisicion_id,
    'OC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.compra_folio_seq')::text, 4, '0'),
    p_proveedor_id,
    v_monto_total,
    v_excede,
    case when v_excede then 'pendiente_aprobacion_exceso' else 'en_proceso' end,
    p_fecha_entrega_estimada,
    p_notas
  )
  returning id into v_compra_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.compra_items (compra_id, requisicion_item_id, precio_unitario)
    values (v_compra_id, (v_item->>'requisicion_item_id')::uuid, (v_item->>'precio_unitario')::numeric);
  end loop;

  -- Los ítems quedan tomados por esta OC exista o no aprobación de exceso
  -- pendiente, para que otra compra no pueda tomarlos mientras se decide.
  update public.requisicion_items set comprado = true where id = any(v_item_ids);

  if not v_excede then
    for rubro in
      select ri.rubro_id as rubro_id, sum(ri.cantidad * (elem->>'precio_unitario')::numeric) as subtotal
      from jsonb_array_elements(p_items) elem
      join public.requisicion_items ri on ri.id = (elem->>'requisicion_item_id')::uuid
      group by ri.rubro_id
    loop
      update public.presupuestos
      set monto_consumido = monto_consumido + rubro.subtotal
      where rubro_id = rubro.rubro_id and area_id = v_area_id and anio = v_anio and mes = v_mes;
    end loop;
  end if;

  update public.requisiciones set estado = 'en_compra' where id = p_requisicion_id;

  return v_compra_id;
end;
$$;

revoke execute on function public.registrar_compra_oc(uuid, uuid, jsonb, timestamptz, text) from public, anon;
grant execute on function public.registrar_compra_oc(uuid, uuid, jsonb, timestamptz, text) to authenticated;

-- ------------------------------------------------------------------------
-- RPC: aprobar_exceso_compra_oc -- reemplaza el `.update()` plano anterior;
-- aplica el descuento de presupuesto diferido por rubro y pasa la compra a
-- `en_proceso`.
-- ------------------------------------------------------------------------
create or replace function public.aprobar_exceso_compra_oc(p_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requisicion_id uuid;
  v_area_id uuid;
  v_estado text;
  v_anio int := extract(year from now())::int;
  v_mes int := extract(month from now())::int;
  rubro record;
begin
  if not public.is_superadmin() then
    raise exception 'Solo un Superadministrador puede aprobar el exceso de presupuesto.';
  end if;

  select requisicion_id, estado into v_requisicion_id, v_estado
  from public.compras where id = p_compra_id;

  if v_requisicion_id is null then
    raise exception 'Compra no encontrada.';
  end if;
  if v_estado <> 'pendiente_aprobacion_exceso' then
    raise exception 'Esta compra no está pendiente de aprobación por exceso de presupuesto.';
  end if;

  select area_id into v_area_id from public.requisiciones where id = v_requisicion_id;

  for rubro in
    select ri.rubro_id as rubro_id, sum(ri.cantidad * ci.precio_unitario) as subtotal
    from public.compra_items ci
    join public.requisicion_items ri on ri.id = ci.requisicion_item_id
    where ci.compra_id = p_compra_id
    group by ri.rubro_id
  loop
    update public.presupuestos
    set monto_consumido = monto_consumido + rubro.subtotal
    where rubro_id = rubro.rubro_id and area_id = v_area_id and anio = v_anio and mes = v_mes;
  end loop;

  update public.compras
  set estado = 'en_proceso', aprobado_superadmin_id = auth.uid()
  where id = p_compra_id;
end;
$$;

revoke execute on function public.aprobar_exceso_compra_oc(uuid) from public, anon;
grant execute on function public.aprobar_exceso_compra_oc(uuid) to authenticated;
