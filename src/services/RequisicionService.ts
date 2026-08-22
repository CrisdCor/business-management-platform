import type { SupabaseClient } from "@supabase/supabase-js";
import { RequisicionRepository, type RequisicionFiltros } from "@/repositories/RequisicionRepository";
import { PresupuestoRepository } from "@/repositories/PresupuestoRepository";
import { Requisicion } from "@/domain/entities/Requisicion";
import { ESTADO_REQUISICION } from "@/domain/enums";

export class RequisicionService {
  private readonly requisiciones: RequisicionRepository;
  private readonly presupuestos: PresupuestoRepository;

  constructor(client: SupabaseClient) {
    this.requisiciones = new RequisicionRepository(client);
    this.presupuestos = new PresupuestoRepository(client);
  }

  listar(filtros: RequisicionFiltros = {}) {
    return this.requisiciones.listar(filtros);
  }

  obtener(id: string) {
    return this.requisiciones.findById(id);
  }

  /**
   * Crea una requisición para el periodo (mes/año) vigente. El estado inicial
   * (pendiente vs. aprobada) lo decide un trigger en base de datos según el
   * rol de quien la crea, para que la regla no pueda saltarse desde el cliente.
   */
  async crear(input: {
    areaId: string;
    rubroId: string;
    descripcion: string;
    montoEstimado: number;
  }): Promise<Requisicion> {
    const ahora = new Date();
    const presupuesto = await this.presupuestos.buscarPorPeriodo(
      input.rubroId,
      input.areaId,
      ahora.getFullYear(),
      ahora.getMonth() + 1,
    );

    if (!presupuesto) {
      throw new Error(
        "No hay un presupuesto asignado para este rubro y área en el mes actual. Solicita a la Asistente Administrativa que lo asigne antes de crear la requisición.",
      );
    }

    return this.requisiciones.insert({
      area_id: input.areaId,
      rubro_id: input.rubroId,
      presupuesto_id: presupuesto.id,
      descripcion: input.descripcion,
      monto_estimado: input.montoEstimado,
    });
  }

  async aprobar(id: string, aprobadorId: string): Promise<Requisicion> {
    return this.requisiciones.update(id, {
      estado: ESTADO_REQUISICION.APROBADA,
      aprobador_id: aprobadorId,
      fecha_aprobacion: new Date().toISOString(),
      motivo_rechazo: null,
    });
  }

  async rechazar(id: string, aprobadorId: string, motivo: string): Promise<Requisicion> {
    return this.requisiciones.update(id, {
      estado: ESTADO_REQUISICION.RECHAZADA,
      aprobador_id: aprobadorId,
      motivo_rechazo: motivo,
    });
  }

  /** Nivel de alerta de consumo para una requisición, según el presupuesto asociado al momento de crearla. */
  async alertaPresupuesto(requisicion: Requisicion) {
    const presupuesto = await this.presupuestos.findById(requisicion.presupuestoId);
    return presupuesto?.nivelAlerta ?? "normal";
  }
}
