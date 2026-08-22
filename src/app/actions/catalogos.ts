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

export async function crearCiudadOperacionAction(nombre: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).crearCiudadOperacion(nombre);
    revalidatePath("/administracion/ciudades");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la ciudad de operación." };
  }
}

export async function actualizarCiudadOperacionAction(
  id: string,
  cambios: { nombre?: string; activo?: boolean },
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).actualizarCiudadOperacion(id, cambios);
    revalidatePath("/administracion/ciudades");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la ciudad de operación." };
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

export async function crearUnidadMedidaAction(nombre: string, abreviatura: string | null): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).crearUnidadMedida(nombre, abreviatura);
    revalidatePath("/compras/unidades-medida");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la unidad de medida." };
  }
}

export async function actualizarUnidadMedidaAction(
  id: string,
  cambios: { nombre?: string; abreviatura?: string | null; activo?: boolean },
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).actualizarUnidadMedida(id, cambios);
    revalidatePath("/compras/unidades-medida");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la unidad de medida." };
  }
}

export async function crearProductoAction(input: {
  nombre: string;
  rubroId: string;
  unidadMedidaId: string;
}): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).crearProducto(input);
    revalidatePath("/compras/productos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el producto." };
  }
}

export async function actualizarProductoAction(
  id: string,
  cambios: Partial<{ nombre: string; rubroId: string; unidadMedidaId: string; activo: boolean }>,
): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new CatalogoService(supabase).actualizarProducto(id, cambios);
    revalidatePath("/compras/productos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar el producto." };
  }
}
