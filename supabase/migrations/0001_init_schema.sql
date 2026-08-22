-- =========================================================================
-- 0001_init_schema.sql
-- Esquema inicial: catálogos, usuarios/roles/permisos y módulo de Compras.
-- =========================================================================

-- ------------------------------------------------------------------------
-- Utilidades comunes
-- ------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------------
-- Catálogo de roles y módulos (permiten agregar nuevos sin tocar código)
-- ------------------------------------------------------------------------
create table public.roles (
  code text primary key,
  label text not null
);

insert into public.roles (code, label) values
  ('superadministrador', 'Superadministrador'),
  ('supervisor', 'Supervisor'),
  ('usuario', 'Usuario'),
  ('consultor', 'Consultor');

create table public.modulos (
  code text primary key,
  label text not null
);

insert into public.modulos (code, label) values
  ('compras.presupuestos', 'Presupuestos'),
  ('compras.rubros', 'Rubros de compra'),
  ('compras.requisiciones', 'Requisiciones'),
  ('compras.compras', 'Compras / OC'),
  ('compras.proveedores', 'Proveedores'),
  ('admin.usuarios', 'Usuarios'),
  ('admin.areas', 'Áreas'),
  ('admin.permisos', 'Permisos');

-- ------------------------------------------------------------------------
-- Áreas (catálogo)
-- ------------------------------------------------------------------------
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------
-- Usuarios (perfil de aplicación 1:1 con auth.users)
-- ------------------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null unique,
  area_id uuid references public.areas (id) on delete set null,
  foto_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger usuarios_set_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

create table public.usuario_roles (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  rol_code text not null references public.roles (code),
  primary key (usuario_id, rol_code)
);

create table public.usuario_permisos (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  modulo_code text not null references public.modulos (code),
  crear boolean not null default false,
  leer boolean not null default false,
  actualizar boolean not null default false,
  eliminar boolean not null default false,
  primary key (usuario_id, modulo_code)
);

-- ------------------------------------------------------------------------
-- Funciones de autorización (usadas por las políticas RLS)
-- ------------------------------------------------------------------------
create or replace function public.has_role(p_rol text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.usuario_roles
    where usuario_id = auth.uid() and rol_code = p_rol
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_role('superadministrador');
$$;

-- ¿Tiene el usuario autenticado el permiso `p_accion` (crear|leer|actualizar|eliminar)
-- sobre el módulo `p_modulo`? El superadministrador siempre tiene acceso total.
create or replace function public.permiso(p_modulo text, p_accion text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_resultado boolean;
begin
  if public.is_superadmin() then
    return true;
  end if;

  execute format(
    'select coalesce(bool_or(%I), false) from public.usuario_permisos where usuario_id = $1 and modulo_code = $2',
    p_accion
  )
  into v_resultado
  using auth.uid(), p_modulo;

  return v_resultado;
end;
$$;

-- ------------------------------------------------------------------------
-- RLS: catálogos base y usuarios
-- ------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.modulos enable row level security;
alter table public.areas enable row level security;
alter table public.usuarios enable row level security;
alter table public.usuario_roles enable row level security;
alter table public.usuario_permisos enable row level security;

create policy "roles: lectura autenticados" on public.roles
  for select to authenticated using (true);

create policy "modulos: lectura autenticados" on public.modulos
  for select to authenticated using (true);

create policy "areas: lectura autenticados" on public.areas
  for select to authenticated using (true);

create policy "areas: escritura admin.areas" on public.areas
  for all to authenticated
  using (public.permiso('admin.areas', 'actualizar'))
  with check (public.permiso('admin.areas', 'crear'));

create policy "usuarios: lectura autenticados" on public.usuarios
  for select to authenticated using (true);

create policy "usuarios: actualizar propio perfil" on public.usuarios
  for update to authenticated
  using (id = auth.uid() or public.permiso('admin.usuarios', 'actualizar'))
  with check (id = auth.uid() or public.permiso('admin.usuarios', 'actualizar'));

create policy "usuarios: gestión admin.usuarios" on public.usuarios
  for insert to authenticated
  with check (public.permiso('admin.usuarios', 'crear'));

create policy "usuarios: eliminar admin.usuarios" on public.usuarios
  for delete to authenticated
  using (public.permiso('admin.usuarios', 'eliminar'));

create policy "usuario_roles: lectura autenticados" on public.usuario_roles
  for select to authenticated using (true);

create policy "usuario_roles: gestión admin.usuarios" on public.usuario_roles
  for all to authenticated
  using (public.permiso('admin.usuarios', 'actualizar'))
  with check (public.permiso('admin.usuarios', 'actualizar'));

create policy "usuario_permisos: lectura propia o admin" on public.usuario_permisos
  for select to authenticated
  using (usuario_id = auth.uid() or public.permiso('admin.permisos', 'leer'));

create policy "usuario_permisos: gestión admin.permisos" on public.usuario_permisos
  for all to authenticated
  using (public.permiso('admin.permisos', 'actualizar'))
  with check (public.permiso('admin.permisos', 'actualizar'));

-- ========================================================================
-- Módulo de Compras
-- ========================================================================

create table public.rubros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rubros_set_updated_at
  before update on public.rubros for each row execute function public.set_updated_at();

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nit_cedula text not null unique,
  nombre text not null,
  banco text not null,
  tipo_cuenta text not null check (tipo_cuenta in ('ahorros', 'corriente')),
  numero_cuenta text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger proveedores_set_updated_at
  before update on public.proveedores for each row execute function public.set_updated_at();

create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  rubro_id uuid not null references public.rubros (id),
  area_id uuid not null references public.areas (id),
  anio int not null check (anio between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  monto_asignado numeric(14, 2) not null check (monto_asignado >= 0),
  monto_consumido numeric(14, 2) not null default 0 check (monto_consumido >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rubro_id, area_id, anio, mes)
);
create trigger presupuestos_set_updated_at
  before update on public.presupuestos for each row execute function public.set_updated_at();

create sequence public.requisicion_folio_seq;
create sequence public.compra_folio_seq;

create table public.requisiciones (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  area_id uuid not null references public.areas (id),
  rubro_id uuid not null references public.rubros (id),
  presupuesto_id uuid not null references public.presupuestos (id),
  solicitante_id uuid not null references public.usuarios (id),
  descripcion text not null,
  monto_estimado numeric(14, 2) not null check (monto_estimado > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada', 'en_compra', 'cerrada')),
  aprobador_id uuid references public.usuarios (id),
  fecha_aprobacion timestamptz,
  motivo_rechazo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger requisiciones_set_updated_at
  before update on public.requisiciones for each row execute function public.set_updated_at();

-- Folio legible + auto-aprobación cuando el solicitante es Supervisor/Superadmin.
create or replace function public.requisiciones_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folio is null then
    new.folio := 'REQ-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.requisicion_folio_seq')::text, 4, '0');
  end if;

  if new.solicitante_id is null then
    new.solicitante_id := auth.uid();
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

create trigger requisiciones_before_insert
  before insert on public.requisiciones
  for each row execute function public.requisiciones_before_insert();

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  requisicion_id uuid not null unique references public.requisiciones (id),
  folio_oc text unique,
  proveedor_id uuid not null references public.proveedores (id),
  monto numeric(14, 2) not null check (monto > 0),
  excede_presupuesto boolean not null default false,
  aprobado_superadmin_id uuid references public.usuarios (id),
  estado text not null default 'en_proceso'
    check (estado in ('pendiente_aprobacion_exceso', 'en_proceso', 'enviada', 'cerrada', 'vencida')),
  fecha_compra timestamptz not null default now(),
  fecha_entrega_estimada timestamptz,
  fecha_cierre timestamptz,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger compras_set_updated_at
  before update on public.compras for each row execute function public.set_updated_at();

-- Folio de OC + verificación de exceso de presupuesto contra lo ya consumido.
create or replace function public.compras_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_presupuesto_id uuid;
  v_disponible numeric(14, 2);
begin
  if new.folio_oc is null then
    new.folio_oc := 'OC-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.compra_folio_seq')::text, 4, '0');
  end if;

  select presupuesto_id into v_presupuesto_id
  from public.requisiciones where id = new.requisicion_id;

  select (monto_asignado - monto_consumido) into v_disponible
  from public.presupuestos where id = v_presupuesto_id;

  if new.monto > coalesce(v_disponible, 0) then
    new.excede_presupuesto := true;
    if new.aprobado_superadmin_id is null then
      new.estado := 'pendiente_aprobacion_exceso';
    end if;
  else
    new.excede_presupuesto := false;
  end if;

  return new;
end;
$$;

create trigger compras_before_insert
  before insert on public.compras
  for each row execute function public.compras_before_insert();

-- Al cerrar/aprobar una compra que no está pendiente de aprobación por exceso,
-- se descuenta del presupuesto y la requisición pasa a "en_compra".
create or replace function public.compras_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado <> 'pendiente_aprobacion_exceso' then
    update public.presupuestos p
    set monto_consumido = p.monto_consumido + new.monto
    from public.requisiciones r
    where r.id = new.requisicion_id and p.id = r.presupuesto_id;

    update public.requisiciones set estado = 'en_compra' where id = new.requisicion_id;
  end if;
  return new;
end;
$$;

create trigger compras_after_insert
  after insert on public.compras
  for each row execute function public.compras_after_insert();

-- Cuando el Superadministrador aprueba una compra que excedía el presupuesto,
-- se aplica el mismo descuento y avance de estado en ese momento.
create or replace function public.compras_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.estado = 'pendiente_aprobacion_exceso' and new.estado <> 'pendiente_aprobacion_exceso' then
    update public.presupuestos p
    set monto_consumido = p.monto_consumido + new.monto
    from public.requisiciones r
    where r.id = new.requisicion_id and p.id = r.presupuesto_id;

    update public.requisiciones set estado = 'en_compra' where id = new.requisicion_id;
  end if;

  if new.estado = 'cerrada' and old.estado <> 'cerrada' then
    update public.requisiciones set estado = 'cerrada' where id = new.requisicion_id;
  end if;

  return new;
end;
$$;

create trigger compras_after_update
  after update on public.compras
  for each row execute function public.compras_after_update();

-- ------------------------------------------------------------------------
-- RLS: Compras
-- ------------------------------------------------------------------------
alter table public.rubros enable row level security;
alter table public.proveedores enable row level security;
alter table public.presupuestos enable row level security;
alter table public.requisiciones enable row level security;
alter table public.compras enable row level security;

create policy "rubros: lectura autenticados" on public.rubros
  for select to authenticated using (true);
create policy "rubros: escritura compras.rubros" on public.rubros
  for all to authenticated
  using (public.permiso('compras.rubros', 'actualizar'))
  with check (public.permiso('compras.rubros', 'crear'));

create policy "proveedores: lectura compras.proveedores" on public.proveedores
  for select to authenticated using (public.permiso('compras.proveedores', 'leer'));
create policy "proveedores: escritura compras.proveedores" on public.proveedores
  for all to authenticated
  using (public.permiso('compras.proveedores', 'actualizar'))
  with check (public.permiso('compras.proveedores', 'crear'));

create policy "presupuestos: lectura compras.presupuestos" on public.presupuestos
  for select to authenticated using (public.permiso('compras.presupuestos', 'leer'));
create policy "presupuestos: escritura compras.presupuestos" on public.presupuestos
  for all to authenticated
  using (public.permiso('compras.presupuestos', 'actualizar'))
  with check (public.permiso('compras.presupuestos', 'crear'));

create policy "requisiciones: lectura compras.requisiciones" on public.requisiciones
  for select to authenticated using (public.permiso('compras.requisiciones', 'leer'));
create policy "requisiciones: crear compras.requisiciones" on public.requisiciones
  for insert to authenticated with check (public.permiso('compras.requisiciones', 'crear'));
create policy "requisiciones: actualizar compras.requisiciones" on public.requisiciones
  for update to authenticated
  using (public.permiso('compras.requisiciones', 'actualizar'))
  with check (public.permiso('compras.requisiciones', 'actualizar'));

create policy "compras: lectura compras.compras" on public.compras
  for select to authenticated using (public.permiso('compras.compras', 'leer'));
create policy "compras: crear compras.compras" on public.compras
  for insert to authenticated with check (public.permiso('compras.compras', 'crear'));
create policy "compras: actualizar compras.compras" on public.compras
  for update to authenticated
  using (public.permiso('compras.compras', 'actualizar'))
  with check (public.permiso('compras.compras', 'actualizar'));

-- ------------------------------------------------------------------------
-- Índices de apoyo para los filtros y tableros más frecuentes
-- ------------------------------------------------------------------------
create index idx_requisiciones_estado on public.requisiciones (estado);
create index idx_requisiciones_area on public.requisiciones (area_id);
create index idx_requisiciones_solicitante on public.requisiciones (solicitante_id);
create index idx_compras_estado on public.compras (estado);
create index idx_presupuestos_periodo on public.presupuestos (anio, mes);
