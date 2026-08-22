"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { RequisicionService } from "@/services/RequisicionService";
import type { AccionResultado } from "@/app/actions/auth";

export async function crearRequisicionAction(input: {
  areaId: string;
  rubroId: string;
  descripcion: string;
  montoEstimado: number;
}): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new RequisicionService(supabase).crear(input);
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la requisición." };
  }
}

export async function aprobarRequisicionAction(id: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) return { ok: false, error: "Sesión expirada." };

  try {
    await new RequisicionService(supabase).aprobar(id, usuario.id);
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo aprobar la requisición." };
  }
}

export async function rechazarRequisicionAction(id: string, motivo: string): Promise<AccionResultado> {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) return { ok: false, error: "Sesión expirada." };

  try {
    await new RequisicionService(supabase).rechazar(id, usuario.id, motivo);
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo rechazar la requisición." };
  }
}
