"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";

export interface AccionResultado {
  ok: boolean;
  error?: string;
}

export async function iniciarSesionAction(
  _prevState: AccionResultado | null,
  formData: FormData,
): Promise<AccionResultado> {
  const correo = String(formData.get("correo") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!correo || !password) {
    return { ok: false, error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();
  const auth = new AuthService(supabase);

  try {
    await auth.iniciarSesion(correo, password);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo iniciar sesión." };
  }

  redirect(redirectTo || "/");
}

export async function cerrarSesionAction(): Promise<void> {
  const supabase = await createClient();
  const auth = new AuthService(supabase);
  await auth.cerrarSesion();
  // Redirect en el propio server action (igual que el login) en vez de dejarlo
  // a un router.push() del cliente: así el cambio de sesión siempre fuerza un
  // render fresco desde el servidor y no arrastra caché de router del cliente
  // de la sesión anterior hacia la nueva.
  redirect("/login");
}

export async function cambiarPasswordAction(nuevaPassword: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const auth = new AuthService(supabase);

  try {
    await auth.cambiarPassword(nuevaPassword);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cambiar la contraseña." };
  }
}
