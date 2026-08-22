import type { SupabaseClient } from "@supabase/supabase-js";
import { AreaRepository } from "@/repositories/AreaRepository";
import { CiudadOperacionRepository } from "@/repositories/CiudadOperacionRepository";
import { RubroRepository } from "@/repositories/RubroRepository";
import { ProveedorRepository } from "@/repositories/ProveedorRepository";
import { ProductoRepository } from "@/repositories/ProductoRepository";
import { UnidadMedidaRepository } from "@/repositories/UnidadMedidaRepository";
import type { TipoCuentaBancaria } from "@/domain/enums";

/**
 * Orquesta los catálogos gestionables por el Superadministrador: áreas,
 * ciudades de operación, rubros, proveedores, productos y unidades de medida.
 */
export class CatalogoService {
  private readonly areas: AreaRepository;
  private readonly ciudadesOperacion: CiudadOperacionRepository;
  private readonly rubros: RubroRepository;
  private readonly proveedores: ProveedorRepository;
  private readonly productos: ProductoRepository;
  private readonly unidadesMedida: UnidadMedidaRepository;

  constructor(client: SupabaseClient) {
    this.areas = new AreaRepository(client);
    this.ciudadesOperacion = new CiudadOperacionRepository(client);
    this.rubros = new RubroRepository(client);
    this.proveedores = new ProveedorRepository(client);
    this.productos = new ProductoRepository(client);
    this.unidadesMedida = new UnidadMedidaRepository(client);
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

  listarCiudadesOperacion() {
    return this.ciudadesOperacion.findAll();
  }

  crearCiudadOperacion(nombre: string) {
    return this.ciudadesOperacion.insert({ nombre, activo: true });
  }

  actualizarCiudadOperacion(id: string, cambios: { nombre?: string; activo?: boolean }) {
    return this.ciudadesOperacion.update(id, cambios);
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

  listarUnidadesMedida() {
    return this.unidadesMedida.findAll();
  }

  crearUnidadMedida(nombre: string, abreviatura: string | null) {
    return this.unidadesMedida.insert({ nombre, abreviatura, activo: true });
  }

  actualizarUnidadMedida(id: string, cambios: { nombre?: string; abreviatura?: string | null; activo?: boolean }) {
    return this.unidadesMedida.update(id, cambios);
  }

  listarProductos() {
    return this.productos.findAll();
  }

  crearProducto(input: { nombre: string; rubroId: string; unidadMedidaId: string }) {
    return this.productos.insert({
      nombre: input.nombre,
      rubro_id: input.rubroId,
      unidad_medida_id: input.unidadMedidaId,
      activo: true,
    });
  }

  actualizarProducto(
    id: string,
    cambios: Partial<{ nombre: string; rubroId: string; unidadMedidaId: string; activo: boolean }>,
  ) {
    return this.productos.update(id, {
      ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
      ...(cambios.rubroId !== undefined ? { rubro_id: cambios.rubroId } : {}),
      ...(cambios.unidadMedidaId !== undefined ? { unidad_medida_id: cambios.unidadMedidaId } : {}),
      ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
    });
  }
}
