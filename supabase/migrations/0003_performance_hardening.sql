-- Hardening de rendimiento según Supabase Advisor:
-- 1) Índices faltantes en columnas de llave foránea usadas en joins/filtros frecuentes.
-- 2) Políticas RLS que reevaluaban auth.uid() por fila -> se envuelve en (select auth.uid())
--    para que el planificador la trate como InitPlan (una sola evaluación por consulta).
-- 3) Políticas "FOR ALL" que se solapaban con políticas SELECT dedicadas -> se dividen
--    en políticas explícitas por operación (insert/update/delete) para eliminar el
--    warning "multiple_permissive_policies".

-- 1) Índices en llaves foráneas
create index if not exists idx_compras_aprobado_superadmin on public.compras (aprobado_superadmin_id);
create index if not exists idx_compras_proveedor on public.compras (proveedor_id);
create index if not exists idx_presupuestos_area on public.presupuestos (area_id);
create index if not exists idx_requisiciones_aprobador on public.requisiciones (aprobador_id);
create index if not exists idx_requisiciones_presupuesto on public.requisiciones (presupuesto_id);
create index if not exists idx_requisiciones_rubro on public.requisiciones (rubro_id);
create index if not exists idx_usuario_permisos_modulo on public.usuario_permisos (modulo_code);
create index if not exists idx_usuario_roles_rol on public.usuario_roles (rol_code);
create index if not exists idx_usuarios_area on public.usuarios (area_id);

-- 2) auth_rls_initplan: reescribir políticas que llamaban auth.uid() directamente
drop policy if exists "usuarios: actualizar propio perfil" on public.usuarios;
create policy "usuarios: actualizar propio perfil" on public.usuarios
  for update
  using (id = (select auth.uid()) or permiso('admin.usuarios', 'actualizar'))
  with check (id = (select auth.uid()) or permiso('admin.usuarios', 'actualizar'));

drop policy if exists "usuario_permisos: lectura propia o admin" on public.usuario_permisos;
create policy "usuario_permisos: lectura propia o admin" on public.usuario_permisos
  for select
  using (usuario_id = (select auth.uid()) or permiso('admin.permisos', 'leer'));

-- 3) multiple_permissive_policies: dividir políticas FOR ALL en políticas por operación

-- areas
drop policy if exists "areas: escritura admin.areas" on public.areas;
create policy "areas: insertar admin.areas" on public.areas
  for insert with check (permiso('admin.areas', 'crear'));
create policy "areas: actualizar admin.areas" on public.areas
  for update using (permiso('admin.areas', 'actualizar')) with check (permiso('admin.areas', 'actualizar'));
create policy "areas: eliminar admin.areas" on public.areas
  for delete using (permiso('admin.areas', 'eliminar'));

-- rubros
drop policy if exists "rubros: escritura compras.rubros" on public.rubros;
create policy "rubros: insertar compras.rubros" on public.rubros
  for insert with check (permiso('compras.rubros', 'crear'));
create policy "rubros: actualizar compras.rubros" on public.rubros
  for update using (permiso('compras.rubros', 'actualizar')) with check (permiso('compras.rubros', 'actualizar'));
create policy "rubros: eliminar compras.rubros" on public.rubros
  for delete using (permiso('compras.rubros', 'eliminar'));

-- proveedores
drop policy if exists "proveedores: escritura compras.proveedores" on public.proveedores;
create policy "proveedores: insertar compras.proveedores" on public.proveedores
  for insert with check (permiso('compras.proveedores', 'crear'));
create policy "proveedores: actualizar compras.proveedores" on public.proveedores
  for update using (permiso('compras.proveedores', 'actualizar')) with check (permiso('compras.proveedores', 'actualizar'));
create policy "proveedores: eliminar compras.proveedores" on public.proveedores
  for delete using (permiso('compras.proveedores', 'eliminar'));

-- presupuestos
drop policy if exists "presupuestos: escritura compras.presupuestos" on public.presupuestos;
create policy "presupuestos: insertar compras.presupuestos" on public.presupuestos
  for insert with check (permiso('compras.presupuestos', 'crear'));
create policy "presupuestos: actualizar compras.presupuestos" on public.presupuestos
  for update using (permiso('compras.presupuestos', 'actualizar')) with check (permiso('compras.presupuestos', 'actualizar'));
create policy "presupuestos: eliminar compras.presupuestos" on public.presupuestos
  for delete using (permiso('compras.presupuestos', 'eliminar'));

-- usuario_roles
drop policy if exists "usuario_roles: gestión admin.usuarios" on public.usuario_roles;
create policy "usuario_roles: insertar admin.usuarios" on public.usuario_roles
  for insert with check (permiso('admin.usuarios', 'actualizar'));
create policy "usuario_roles: eliminar admin.usuarios" on public.usuario_roles
  for delete using (permiso('admin.usuarios', 'actualizar'));

-- usuario_permisos
drop policy if exists "usuario_permisos: gestión admin.permisos" on public.usuario_permisos;
create policy "usuario_permisos: insertar admin.permisos" on public.usuario_permisos
  for insert with check (permiso('admin.permisos', 'actualizar'));
create policy "usuario_permisos: actualizar admin.permisos" on public.usuario_permisos
  for update using (permiso('admin.permisos', 'actualizar')) with check (permiso('admin.permisos', 'actualizar'));
create policy "usuario_permisos: eliminar admin.permisos" on public.usuario_permisos
  for delete using (permiso('admin.permisos', 'actualizar'));
