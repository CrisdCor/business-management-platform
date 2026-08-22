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

  obtenerPorRequisicion(requisicionId: string) {
    return this.compras.buscarPorRequisicion(requisicionId);
  }

  /**
   * Registra la compra a partir de una requisición ya aprobada. Si el monto
   * excede el disponible del presupuesto, el trigger de base de datos deja
   * la compra en `pendiente_aprobacion_exceso` hasta que el Superadministrador
   * la apruebe con `aprobarExceso`.
   */
  async registrar(input: {
    requisicionId: string;
    proveedorId: string;
    monto: number;
    fechaEntregaEstimada: string | null;
    notas: string | null;
  }): Promise<Compra> {
    return this.compras.insert({
      requisicion_id: input.requisicionId,
      proveedor_id: input.proveedorId,
      monto: input.monto,
      fecha_entrega_estimada: input.fechaEntregaEstimada,
      notas: input.notas,
    });
  }

  async aprobarExceso(id: string, superadminId: string): Promise<Compra> {
    return this.compras.update(id, {
      aprobado_superadmin_id: superadminId,
      estado: ESTADO_COMPRA.EN_PROCESO,
    });
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
