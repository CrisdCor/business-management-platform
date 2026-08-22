"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UsuarioService } from "@/services/UsuarioService";
import type { AccionResultado } from "@/app/actions/auth";
import type { PermisoRow } from "@/domain/entities/PermisoMatriz";
import type { RoleCode } from "@/domain/enums";

export async function crearUsuarioAction(input: {
  nombre: string;
  correo: string;
  areaId: string | null;
  ciudadOperacionId: string | null;
  roles: RoleCode[];
  permisos: PermisoRow[];
  passwordTemporal: string;
}): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    // DIAGNÓSTICO TEMPORAL: ver el payload real de creación. Quitar tras el incidente.
    console.log(
      "[diag crearUsuarioAction] correo=%s roles=%j permisos=%j",
      input.correo,
      input.roles,
      input.permisos.filter((p) => p.crear || p.leer || p.actualizar || p.eliminar),
    );
    await new UsuarioService(supabase).crear(input);
    revalidatePath("/administracion/usuarios");
    return { ok: true };
  } catch (error) {
    console.error("[diag crearUsuarioAction] error:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el usuario." };
  }
}

export async function actualizarUsuarioAction(
  id: string,
  input: {
    nombre?: string;
    areaId?: string | null;
    ciudadOperacionId?: string | null;
    activo?: boolean;
    roles?: RoleCode[];
    permisos?: PermisoRow[];
  },
): Promise<AccionResultado> {
  const supabase = await createClient();
  const servicio = new UsuarioService(supabase);
  try {
    if (
      input.nombre !== undefined ||
      input.areaId !== undefined ||
      input.ciudadOperacionId !== undefined ||
      input.activo !== undefined
    ) {
      await servicio.actualizarPerfil(id, {
        nombre: input.nombre,
        areaId: input.areaId,
        ciudadOperacionId: input.ciudadOperacionId,
        activo: input.activo,
      });
    }
    if (input.roles) {
      console.log("[diag actualizarUsuarioAction] usuarioId=%s roles=%j", id, input.roles);
      await servicio.actualizarRoles(id, input.roles);
    }
    if (input.permisos) {
      // DIAGNÓSTICO TEMPORAL: registrar qué llega realmente del cliente para
      // depurar el reporte de permisos que no persisten en el módulo de
      // Usuarios. Quitar una vez cerrado el incidente.
      console.log(
        "[diag actualizarUsuarioAction] usuarioId=%s permisos=%j",
        id,
        input.permisos.filter((p) => p.crear || p.leer || p.actualizar || p.eliminar),
      );
      await servicio.actualizarPermisos(id, input.permisos);
    }

    revalidatePath("/administracion/usuarios");
    return { ok: true };
  } catch (error) {
    console.error("[diag actualizarUsuarioAction] error:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar el usuario." };
  }
}

export async function resetearPasswordUsuarioAction(id: string, nuevaPassword: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new UsuarioService(supabase).resetearPassword(id, nuevaPassword);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo resetear la contraseña." };
  }
}
