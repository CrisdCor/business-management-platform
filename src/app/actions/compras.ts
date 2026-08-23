"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CompraService } from "@/services/CompraService";
import type { AccionResultado } from "@/app/actions/auth";

export async function registrarCompraAction(input: {
  proveedorId: string;
  items: { requisicionItemId: string; cantidad: number; precioUnitario: number }[];
  fechaEntregaEstimada: string | null;
  notas: string | null;
}): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CompraService(supabase).registrar(input);
    revalidatePath("/compras/ordenes");
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo registrar la compra." };
  }
}

export async function aprobarExcesoCompraAction(id: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CompraService(supabase).aprobarExceso(id);
    revalidatePath("/compras/ordenes");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo aprobar la compra." };
  }
}

export async function marcarCompraEnviadaAction(id: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CompraService(supabase).marcarEnviada(id);
    revalidatePath("/compras/ordenes");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la compra." };
  }
}

export async function cerrarCompraAction(id: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CompraService(supabase).cerrar(id);
    revalidatePath("/compras/ordenes");
    revalidatePath("/compras/requisiciones");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cerrar la compra." };
  }
}
