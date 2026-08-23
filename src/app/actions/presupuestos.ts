"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PresupuestoService } from "@/services/PresupuestoService";
import type { AccionResultado } from "@/app/actions/auth";

export async function asignarPresupuestoAction(input: {
  rubroId: string;
  areaId: string;
  ciudadOperacionId: string;
  anio: number;
  mes: number;
  montoAsignado: number;
}): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new PresupuestoService(supabase).asignar(input);
    revalidatePath("/compras/presupuestos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo asignar el presupuesto." };
  }
}

export async function ajustarPresupuestoAction(id: string, montoAsignado: number): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new PresupuestoService(supabase).ajustarMonto(id, montoAsignado);
    revalidatePath("/compras/presupuestos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo ajustar el presupuesto." };
  }
}
