import type { SupabaseClient } from "@supabase/supabase-js";
import { Usuario, type UsuarioRow } from "@/domain/entities/Usuario";
import type { PermisoRow } from "@/domain/entities/PermisoMatriz";
import type { RoleCode } from "@/domain/enums";

interface UsuarioQueryRow extends UsuarioRow {
  area?: { nombre: string } | null;
  usuario_roles: { rol_code: RoleCode }[];
  usuario_permisos: PermisoRow[];
}

const SELECT =
  "*, area:areas(nombre), usuario_roles(rol_code), usuario_permisos(modulo_code, crear, leer, actualizar, eliminar)";

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
        modulo: p.modulo as PermisoRow["modulo"],
        crear: p.crear,
        leer: p.leer,
        actualizar: p.actualizar,
        eliminar: p.eliminar,
      })) ?? [];

    return Usuario.desdeFila(
      { ...row, area_nombre: row.area?.nombre ?? null, roles },
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
    cambios: Partial<Pick<UsuarioRow, "nombre" | "area_id" | "foto_url" | "activo">>,
  ): Promise<void> {
    const { error } = await this.client.from("usuarios").update(cambios).eq("id", id);
    if (error) throw new Error(`[usuarios] actualizarPerfil: ${error.message}`);
  }

  async reemplazarRoles(usuarioId: string, roles: RoleCode[]): Promise<void> {
    const { error: delError } = await this.client
      .from("usuario_roles")
      .delete()
      .eq("usuario_id", usuarioId);
    if (delError) throw new Error(`[usuario_roles] delete: ${delError.message}`);

    if (roles.length === 0) return;
    const { error: insError } = await this.client
      .from("usuario_roles")
      .insert(roles.map((rol_code) => ({ usuario_id: usuarioId, rol_code })));
    if (insError) throw new Error(`[usuario_roles] insert: ${insError.message}`);
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
