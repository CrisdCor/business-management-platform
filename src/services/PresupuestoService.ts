import type { SupabaseClient } from "@supabase/supabase-js";
import { PresupuestoRepository } from "@/repositories/PresupuestoRepository";
import type { Presupuesto } from "@/domain/entities/Presupuesto";

/** Orquesta la asignación mensual de presupuesto por rubro + área + ciudad de operación (rol: Asistente Administrativa). */
export class PresupuestoService {
  private readonly presupuestos: PresupuestoRepository;

  constructor(client: SupabaseClient) {
    this.presupuestos = new PresupuestoRepository(client);
  }

  listarPorPeriodo(anio: number, mes: number): Promise<Presupuesto[]> {
    return this.presupuestos.listarPorPeriodo(anio, mes);
  }

  obtener(id: string) {
    return this.presupuestos.findById(id);
  }

  asignar(input: {
    rubroId: string;
    areaId: string;
    ciudadOperacionId: string;
    anio: number;
    mes: number;
    montoAsignado: number;
  }): Promise<Presupuesto> {
    return this.presupuestos.insert({
      rubro_id: input.rubroId,
      area_id: input.areaId,
      ciudad_operacion_id: input.ciudadOperacionId,
      anio: input.anio,
      mes: input.mes,
      monto_asignado: input.montoAsignado,
    });
  }

  ajustarMonto(id: string, montoAsignado: number): Promise<Presupuesto> {
    return this.presupuestos.update(id, { monto_asignado: montoAsignado });
  }
}
