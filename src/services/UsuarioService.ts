import type { SupabaseClient } from "@supabase/supabase-js";
import { UsuarioRepository } from "@/repositories/UsuarioRepository";
import type { PermisoRow } from "@/domain/entities/PermisoMatriz";
import type { RoleCode } from "@/domain/enums";
import { AuthService } from "@/services/AuthService";

/** Orquesta la gestión de usuarios, sus roles (posiblemente varios) y su matriz de permisos por módulo. */
export class UsuarioService {
  private readonly usuarios: UsuarioRepository;

  constructor(client: SupabaseClient) {
    this.usuarios = new UsuarioRepository(client);
  }

  listar() {
    return this.usuarios.findAll();
  }

  obtener(id: string) {
    return this.usuarios.findById(id);
  }

  async crear(input: {
    nombre: string;
    correo: string;
    areaId: string | null;
    ciudadOperacionId: string | null;
    roles: RoleCode[];
    permisos: PermisoRow[];
    passwordTemporal: string;
  }): Promise<string> {
    const usuarioId = await AuthService.crearUsuarioConPerfil({
      nombre: input.nombre,
      correo: input.correo,
      passwordTemporal: input.passwordTemporal,
      areaId: input.areaId,
      ciudadOperacionId: input.ciudadOperacionId,
    });

    await this.usuarios.reemplazarRoles(usuarioId, input.roles);
    await this.usuarios.reemplazarPermisos(usuarioId, input.permisos);

    return usuarioId;
  }

  async actualizarPerfil(
    id: string,
    cambios: {
      nombre?: string;
      areaId?: string | null;
      ciudadOperacionId?: string | null;
      fotoUrl?: string | null;
      activo?: boolean;
    },
  ): Promise<void> {
    await this.usuarios.actualizarPerfil(id, {
      ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
      ...(cambios.areaId !== undefined ? { area_id: cambios.areaId } : {}),
      ...(cambios.ciudadOperacionId !== undefined ? { ciudad_operacion_id: cambios.ciudadOperacionId } : {}),
      ...(cambios.fotoUrl !== undefined ? { foto_url: cambios.fotoUrl } : {}),
      ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
    });
  }

  actualizarRoles(id: string, roles: RoleCode[]): Promise<void> {
    return this.usuarios.reemplazarRoles(id, roles);
  }

  actualizarPermisos(id: string, permisos: PermisoRow[]): Promise<void> {
    return this.usuarios.reemplazarPermisos(id, permisos);
  }

  /** El Superadministrador resetea la contraseña de otro usuario (acción administrativa). */
  resetearPassword(id: string, nuevaPassword: string): Promise<void> {
    return AuthService.resetearPassword(id, nuevaPassword);
  }
}
