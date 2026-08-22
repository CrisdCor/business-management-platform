"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CatalogoService } from "@/services/CatalogoService";
import type { AccionResultado } from "@/app/actions/auth";
import type { TipoCuentaBancaria } from "@/domain/enums";

export async function crearAreaAction(nombre: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).crearArea(nombre);
    revalidatePath("/administracion/areas");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el área." };
  }
}

export async function actualizarAreaAction(
  id: string,
  cambios: { nombre?: string; activo?: boolean },
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).actualizarArea(id, cambios);
    revalidatePath("/administracion/areas");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar el área." };
  }
}

export async function crearRubroAction(nombre: string, descripcion: string | null): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).crearRubro(nombre, descripcion);
    revalidatePath("/compras/rubros");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el rubro." };
  }
}

export async function actualizarRubroAction(
  id: string,
  cambios: { nombre?: string; descripcion?: string | null; activo?: boolean },
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).actualizarRubro(id, cambios);
    revalidatePath("/compras/rubros");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar el rubro." };
  }
}

export async function crearProveedorAction(input: {
  nitCedula: string;
  nombre: string;
  banco: string;
  tipoCuenta: TipoCuentaBancaria;
  numeroCuenta: string;
}): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).crearProveedor(input);
    revalidatePath("/compras/proveedores");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el proveedor." };
  }
}

export async function actualizarProveedorAction(
  id: string,
  cambios: Partial<{
    nombre: string;
    banco: string;
    tipoCuenta: TipoCuentaBancaria;
    numeroCuenta: string;
    activo: boolean;
  }>,
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).actualizarProveedor(id, cambios);
    revalidatePath("/compras/proveedores");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar el proveedor." };
  }
}
