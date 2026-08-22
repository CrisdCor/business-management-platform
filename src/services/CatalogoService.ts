import type { SupabaseClient } from "@supabase/supabase-js";
import { AreaRepository } from "@/repositories/AreaRepository";
import { RubroRepository } from "@/repositories/RubroRepository";
import { ProveedorRepository } from "@/repositories/ProveedorRepository";
import type { TipoCuentaBancaria } from "@/domain/enums";

/** Orquesta los catálogos gestionables por el Superadministrador: áreas, rubros y proveedores. */
export class CatalogoService {
  private readonly areas: AreaRepository;
  private readonly rubros: RubroRepository;
  private readonly proveedores: ProveedorRepository;

  constructor(client: SupabaseClient) {
    this.areas = new AreaRepository(client);
    this.rubros = new RubroRepository(client);
    this.proveedores = new ProveedorRepository(client);
  }

  listarAreas() {
    return this.areas.findAll();
  }

  crearArea(nombre: string) {
    return this.areas.insert({ nombre, activo: true });
  }

  actualizarArea(id: string, cambios: { nombre?: string; activo?: boolean }) {
    return this.areas.update(id, cambios);
  }

  listarRubros() {
    return this.rubros.findAll();
  }

  crearRubro(nombre: string, descripcion: string | null) {
    return this.rubros.insert({ nombre, descripcion, activo: true });
  }

  actualizarRubro(id: string, cambios: { nombre?: string; descripcion?: string | null; activo?: boolean }) {
    return this.rubros.update(id, cambios);
  }

  listarProveedores() {
    return this.proveedores.findAll();
  }

  crearProveedor(input: {
    nitCedula: string;
    nombre: string;
    banco: string;
    tipoCuenta: TipoCuentaBancaria;
    numeroCuenta: string;
  }) {
    return this.proveedores.insert({
      nit_cedula: input.nitCedula,
      nombre: input.nombre,
      banco: input.banco,
      tipo_cuenta: input.tipoCuenta,
      numero_cuenta: input.numeroCuenta,
      activo: true,
    });
  }

  actualizarProveedor(
    id: string,
    cambios: Partial<{
      nombre: string;
      banco: string;
      tipoCuenta: TipoCuentaBancaria;
      numeroCuenta: string;
      activo: boolean;
    }>,
  ) {
    return this.proveedores.update(id, {
      ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
      ...(cambios.banco !== undefined ? { banco: cambios.banco } : {}),
      ...(cambios.tipoCuenta !== undefined ? { tipo_cuenta: cambios.tipoCuenta } : {}),
      ...(cambios.numeroCuenta !== undefined ? { numero_cuenta: cambios.numeroCuenta } : {}),
      ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
    });
  }
}
