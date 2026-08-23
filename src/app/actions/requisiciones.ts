"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RequisicionService } from "@/services/RequisicionService";
import type { AccionResultado } from "@/app/actions/auth";

export async function crearRequisicionAction(input: {
  descripcion?: string | null;
  items: { productoId: string; cantidad: number; observacion: string | null }[];
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
  try {
    await new RequisicionService(supabase).aprobar(id);
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo aprobar la requisición." };
  }
}

export async function rechazarRequisicionAction(id: string, motivo: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new RequisicionService(supabase).rechazar(id, motivo);
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo rechazar la requisición." };
  }
}

export async function editarRequisicionAction(
  id: string,
  input: {
    descripcion?: string | null;
    items: { productoId: string; cantidad: number; observacion: string | null }[];
  },
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new RequisicionService(supabase).editar(id, input);
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo editar la requisición." };
  }
}

export async function anularSaldoRequisicionItemAction(
  requisicionItemId: string,
  motivo: string,
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new RequisicionService(supabase).anularSaldoItem(requisicionItemId, motivo);
    revalidatePath("/compras/requisiciones");
    revalidatePath("/compras/ordenes");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo anular el saldo del ítem." };
  }
}
