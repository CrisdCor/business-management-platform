import type { SupabaseClient } from "@supabase/supabase-js";
import { Usuario, type UsuarioRow } from "@/domain/entities/Usuario";
import type { PermisoRow } from "@/domain/entities/PermisoMatriz";
import type { RoleCode } from "@/domain/enums";

interface UsuarioQueryRow extends UsuarioRow {
  area?: { nombre: string } | null;
  ciudad_operacion?: { nombre: string } | null;
  supervisor?: { nombre: string } | null;
  usuario_roles: { rol_code: RoleCode }[];
  // Forma real de la fila que devuelve `SELECT` (columna `modulo_code`, no
  // `modulo`): se tipa aparte de `PermisoRow` a propósito, para que un typo
  // como `p.modulo` (en vez de `p.modulo_code`) lo detecte el compilador en
  // vez de colar un `undefined` silencioso — que es justo el bug que esto
  // reemplaza (todas las filas colapsaban en una sola con `modulo: undefined`).
  usuario_permisos: { modulo_code: string; crear: boolean; leer: boolean; actualizar: boolean; eliminar: boolean }[];
}

const SELECT =
  "*, area:areas(nombre), ciudad_operacion:ciudades_operacion(nombre), supervisor:usuarios!usuarios_supervisor_id_fkey(nombre), usuario_roles(rol_code), usuario_permisos(modulo_code, crear, leer, actualizar, eliminar)";

/**
 * Repositorio de usuarios. No hereda de `BaseRepository` porque la entidad
 * de dominio `Usuario` se construye a partir de tres tablas (usuarios,
 * usuario_roles, usuario_permisos): el mapeo es intrínsecamente distinto al
 * CRUD 1:1 que resuelve la clase base.
 */
export class UsuarioRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapRow(row: UsuarioQueryRow): Usuario {
    const roles = row.usuario_roles?.map((r) => r.rol_code) ?? [];
    const permisos: PermisoRow[] =
      row.usuario_permisos?.map((p) => ({
        modulo: p.modulo_code as PermisoRow["modulo"],
        crear: p.crear,
        leer: p.leer,
        actualizar: p.actualizar,
        eliminar: p.eliminar,
      })) ?? [];

    return Usuario.desdeFila(
      {
        ...row,
        area_nombre: row.area?.nombre ?? null,
        ciudad_operacion_nombre: row.ciudad_operacion?.nombre ?? null,
        supervisor_nombre: row.supervisor?.nombre ?? null,
        roles,
      },
      permisos,
    );
  }

  async findAll(): Promise<Usuario[]> {
    const { data, error } = await this.client.from("usuarios").select(SELECT).order("nombre");
    if (error) throw new Error(`[usuarios] findAll: ${error.message}`);
    return (data as unknown as UsuarioQueryRow[]).map((r) => this.mapRow(r));
  }

  async findById(id: string): Promise<Usuario | null> {
    const { data, error } = await this.client
      .from("usuarios")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`[usuarios] findById: ${error.message}`);
    return data ? this.mapRow(data as unknown as UsuarioQueryRow) : null;
  }

  async findByCorreo(correo: string): Promise<Usuario | null> {
    const { data, error } = await this.client
      .from("usuarios")
      .select(SELECT)
      .eq("correo", correo)
      .maybeSingle();
    if (error) throw new Error(`[usuarios] findByCorreo: ${error.message}`);
    return data ? this.mapRow(data as unknown as UsuarioQueryRow) : null;
  }

  /** Actualiza los datos de perfil (no roles/permisos, que se gestionan aparte). */
  async actualizarPerfil(
    id: string,
    cambios: Partial<Pick<UsuarioRow, "nombre" | "area_id" | "ciudad_operacion_id" | "supervisor_id" | "foto_url" | "activo">>,
  ): Promise<void> {
    const { error } = await this.client.from("usuarios").update(cambios).eq("id", id);
    if (error) throw new Error(`[usuarios] actualizarPerfil: ${error.message}`);
  }

  /**
   * Reemplaza los roles de un usuario en una sola transacción atómica del lado
   * de la base de datos (función `reemplazar_roles_usuario`), que además
   * rechaza la operación completa si el resultado deja al sistema sin ningún
   * Superadministrador activo. Antes esto era un DELETE + INSERT en dos
   * llamadas separadas sin ninguna validación, lo que permitió que un usuario
   * se quedara sin su propio rol de Superadministrador y bloqueara la app.
   */
  async reemplazarRoles(usuarioId: string, roles: RoleCode[]): Promise<void> {
    const { error } = await this.client.rpc("reemplazar_roles_usuario", {
      p_usuario_id: usuarioId,
      p_roles: roles,
    });
    if (error) throw new Error(`[usuario_roles] reemplazar: ${error.message}`);
  }

  /**
   * IDs de usuarios con al menos un "movimiento" (solicitaron o aprobaron una
   * requisición, o aprobaron un exceso de presupuesto en una compra). Se usa
   * solo para reflejar en la UI cuáles NO son elegibles para el borrado
   * definitivo; la RPC `eliminarDefinitivo` vuelve a validar esto mismo como
   * fuente de verdad antes de borrar.
   */
  async idsConMovimientos(): Promise<Set<string>> {
    const [requisiciones, compras] = await Promise.all([
      this.client.from("requisiciones").select("solicitante_id, aprobador_id"),
      this.client.from("compras").select("aprobado_superadmin_id"),
    ]);
    if (requisiciones.error) throw new Error(`[usuarios] idsConMovimientos (requisiciones): ${requisiciones.error.message}`);
    if (compras.error) throw new Error(`[usuarios] idsConMovimientos (compras): ${compras.error.message}`);

    const ids = new Set<string>();
    for (const r of requisiciones.data ?? []) {
      ids.add(r.solicitante_id);
      if (r.aprobador_id) ids.add(r.aprobador_id);
    }
    for (const c of compras.data ?? []) {
      if (c.aprobado_superadmin_id) ids.add(c.aprobado_superadmin_id);
    }
    return ids;
  }

  /**
   * Borrado definitivo del perfil (`public.usuarios`): la función RPC
   * `security definer` re-valida que quien llama es Superadministrador, que
   * no se esté auto-eliminando, que el usuario no tenga movimientos y que no
   * sea el único Superadministrador, antes de borrar. La cascada existente en
   * el esquema se encarga de `usuario_roles`, `usuario_permisos` y
   * `notificaciones`. La cuenta de `auth.users` se borra aparte (ver
   * `AuthService.eliminarUsuarioAuth`).
   */
  async eliminarDefinitivo(usuarioId: string): Promise<void> {
    const { error } = await this.client.rpc("eliminar_usuario_definitivo", { p_usuario_id: usuarioId });
    if (error) throw new Error(error.message);
  }

  async reemplazarPermisos(usuarioId: string, permisos: PermisoRow[]): Promise<void> {
    const { error: delError } = await this.client
      .from("usuario_permisos")
      .delete()
      .eq("usuario_id", usuarioId);
    if (delError) throw new Error(`[usuario_permisos] delete: ${delError.message}`);

    if (permisos.length === 0) return;
    const { error: insError } = await this.client.from("usuario_permisos").insert(
      permisos.map((p) => ({
        usuario_id: usuarioId,
        modulo_code: p.modulo,
        crear: p.crear,
        leer: p.leer,
        actualizar: p.actualizar,
        eliminar: p.eliminar,
      })),
    );
    if (insError) throw new Error(`[usuario_permisos] insert: ${insError.message}`);
  }
}
