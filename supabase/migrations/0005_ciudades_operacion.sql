-- Catálogo de Ciudades de Operación + campo en usuarios, siguiendo el mismo
-- patrón que "areas": tabla simple con RLS de lectura para autenticados y
-- escritura gestionada por el Superadministrador vía el módulo
-- "admin.ciudades" (políticas separadas por operación desde el inicio, para
-- no repetir el problema de multiple_permissive_policies resuelto en
-- 0003_performance_hardening.sql).

insert into public.modulos (code, label) values
  ('admin.ciudades', 'Ciudades de operación');

create table public.ciudades_operacion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ciudades_operacion_set_updated_at
  before update on public.ciudades_operacion
  for each row execute function public.set_updated_at();

alter table public.usuarios
  add column ciudad_operacion_id uuid references public.ciudades_operacion (id) on delete set null;

create index idx_usuarios_ciudad_operacion on public.usuarios (ciudad_operacion_id);

alter table public.ciudades_operacion enable row level security;

create policy "ciudades_operacion: lectura autenticados" on public.ciudades_operacion
  for select
  using (true);

create policy "ciudades_operacion: insertar admin.ciudades" on public.ciudades_operacion
  for insert
  with check (public.permiso('admin.ciudades', 'crear'));

create policy "ciudades_operacion: actualizar admin.ciudades" on public.ciudades_operacion
  for update
  using (public.permiso('admin.ciudades', 'actualizar'))
  with check (public.permiso('admin.ciudades', 'actualizar'));

create policy "ciudades_operacion: eliminar admin.ciudades" on public.ciudades_operacion
  for delete
  using (public.permiso('admin.ciudades', 'eliminar'));
