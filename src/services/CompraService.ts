import type { SupabaseClient } from "@supabase/supabase-js";
import { CompraRepository, type CompraFiltros } from "@/repositories/CompraRepository";
import { Compra } from "@/domain/entities/Compra";
import { ESTADO_COMPRA } from "@/domain/enums";

export class CompraService {
  private readonly compras: CompraRepository;

  constructor(client: SupabaseClient) {
    this.compras = new CompraRepository(client);
  }

  listar(filtros: CompraFiltros = {}) {
    return this.compras.listar(filtros);
  }

  obtener(id: string) {
    return this.compras.findById(id);
  }

  /** Una requisición puede tener varias compras (compra parcial por ítems). */
  obtenerPorRequisicion(requisicionId: string) {
    return this.compras.listarPorRequisicion(requisicionId);
  }

  /**
   * Registra la compra (OC) a partir de ítems pendientes de una o varias
   * requisiciones ya aprobadas (siempre que compartan área y ciudad de
   * operación) -- cada ítem puede pedir menos de lo pendiente (compra
   * parcial). La RPC `registrar_compra_oc` valida saldo/disponibilidad de
   * cada ítem y el presupuesto por rubro; si algún rubro excede el
   * disponible, la compra queda en `pendiente_aprobacion_exceso` hasta que
   * el Superadministrador la apruebe con `aprobarExceso`.
   */
  async registrar(input: {
    proveedorId: string;
    items: { requisicionItemId: string; cantidad: number; precioUnitario: number }[];
    fechaEntregaEstimada: string | null;
    notas: string | null;
  }): Promise<Compra> {
    if (input.items.length === 0) {
      throw new Error("La compra debe incluir al menos un ítem.");
    }
    return this.compras.registrarConItems(input);
  }

  /** Aprueba el exceso de presupuesto. La RPC exige que quien aprueba sea Superadministrador. */
  async aprobarExceso(id: string): Promise<Compra> {
    return this.compras.aprobarExceso(id);
  }

  async marcarEnviada(id: string): Promise<Compra> {
    return this.compras.update(id, { estado: ESTADO_COMPRA.ENVIADA });
  }

  /** El área administrativa cierra la compra al recibir confirmación de entrega del proveedor. */
  async cerrar(id: string): Promise<Compra> {
    return this.compras.update(id, {
      estado: ESTADO_COMPRA.CERRADA,
      fecha_cierre: new Date().toISOString(),
    });
  }
}
