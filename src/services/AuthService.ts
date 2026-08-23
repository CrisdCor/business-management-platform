import type { SupabaseClient } from "@supabase/supabase-js";
import { UsuarioRepository } from "@/repositories/UsuarioRepository";
import { Usuario } from "@/domain/entities/Usuario";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Orquesta autenticación y el ciclo de vida de la sesión. Traduce entre la
 * sesión de Supabase Auth (auth.users) y la entidad de dominio `Usuario`
 * (perfil + roles + permisos).
 */
export class AuthService {
  private readonly usuarios: UsuarioRepository;

  constructor(private readonly client: SupabaseClient) {
    this.usuarios = new UsuarioRepository(client);
  }

  async iniciarSesion(correo: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: correo,
      password,
    });
    if (error) throw new Error(traducirErrorAuth(error.message));
    return data;
  }

  async cerrarSesion(): Promise<void> {
    await this.client.auth.signOut();
  }

  /** Usuario autenticado actual, con su matriz de permisos ya resuelta, o null si no hay sesión. */
  async usuarioActual(): Promise<Usuario | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) return null;
    return this.usuarios.findById(user.id);
  }

  /** El propio usuario cambia su contraseña (requiere sesión activa). */
  async cambiarPassword(nuevaPassword: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password: nuevaPassword });
    if (error) throw new Error(traducirErrorAuth(error.message));
  }

  /**
   * El Superadministrador resetea la contraseña de otro usuario.
   * Requiere la service role key: solo se invoca desde Server Actions/Route
   * Handlers, nunca desde el cliente.
   */
  static async resetearPassword(usuarioId: string, nuevaPassword: string): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(usuarioId, {
      password: nuevaPassword,
    });
    if (error) throw new Error(traducirErrorAuth(error.message));
  }

  /**
   * Borra por completo la cuenta de Auth (`auth.users` + sesiones/identidades
   * internas) de un usuario cuyo perfil (`public.usuarios`) ya fue eliminado
   * por la RPC `eliminar_usuario_definitivo`. Se trata como idempotente: si la
   * cuenta ya no existe (reintento tras un fallo parcial previo) no es error.
   */
  static async eliminarUsuarioAuth(usuarioId: string): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(usuarioId);
    if (error && !/not.*found/i.test(error.message)) {
      throw new Error(
        `El perfil se eliminó, pero no se pudo borrar la cuenta de acceso (${error.message}). Vuelve a intentarlo o contacta soporte.`,
      );
    }
  }

  /** Crea el usuario de Auth + su perfil. Requiere permisos de administración (service role). */
  static async crearUsuarioConPerfil(input: {
    nombre: string;
    correo: string;
    passwordTemporal: string;
    areaId: string | null;
    ciudadOperacionId: string | null;
    supervisorId: string | null;
  }): Promise<string> {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.correo,
      password: input.passwordTemporal,
      email_confirm: true,
      user_metadata: { nombre: input.nombre },
    });
    if (error || !data.user) throw new Error(traducirErrorAuth(error?.message ?? "No se pudo crear el usuario"));

    const { error: perfilError } = await admin.from("usuarios").insert({
      id: data.user.id,
      nombre: input.nombre,
      correo: input.correo,
      area_id: input.areaId,
      ciudad_operacion_id: input.ciudadOperacionId,
      supervisor_id: input.supervisorId,
    });
    if (perfilError) throw new Error(perfilError.message);

    return data.user.id;
  }
}

function traducirErrorAuth(mensaje: string): string {
  if (mensaje.includes("Invalid login credentials")) {
    return "Usuario o contraseña incorrectos.";
  }
  if (mensaje.includes("Password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return mensaje;
}
