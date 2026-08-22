import { Entity, parseDate } from "@/domain/entities/Entity";
import { UMBRAL_ALERTA_PRESUPUESTO, UMBRAL_CRITICO_PRESUPUESTO } from "@/domain/enums";

export type NivelAlertaPresupuesto = "normal" | "alerta" | "excedido";

export interface PresupuestoRow {
  id: string;
  rubro_id: string;
  rubro_nombre?: string | null;
  area_id: string;
  area_nombre?: string | null;
  anio: number;
  mes: number;
  monto_asignado: number;
  monto_consumido: number;
  created_at: string;
  updated_at: string;
}

/**
 * Presupuesto mensual asignado por la Asistente Administrativa a un
 * rubro + área. Encapsula el cálculo de consumo, que alimenta tanto las
 * alertas de la requisición como el bloqueo de compras por exceso.
 */
export class Presupuesto extends Entity<PresupuestoRow> {
  private constructor(
    id: string,
    public readonly rubroId: string,
    public readonly rubroNombre: string | null,
    public readonly areaId: string,
    public readonly areaNombre: string | null,
    public readonly anio: number,
    public readonly mes: number,
    public readonly montoAsignado: number,
    public readonly montoConsumido: number,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: PresupuestoRow): Presupuesto {
    return new Presupuesto(
      row.id,
      row.rubro_id,
      row.rubro_nombre ?? null,
      row.area_id,
      row.area_nombre ?? null,
      row.anio,
      row.mes,
      Number(row.monto_asignado),
      Number(row.monto_consumido),
      parseDate(row.created_at),
      parseDate(row.updated_at),
    );
  }

  public get disponible(): number {
    return this.montoAsignado - this.montoConsumido;
  }

  public get porcentajeConsumido(): number {
    if (this.montoAsignado <= 0) return 0;
    return Math.round((this.montoConsumido / this.montoAsignado) * 100);
  }

  public get nivelAlerta(): NivelAlertaPresupuesto {
    const pct = this.porcentajeConsumido;
    if (pct >= UMBRAL_CRITICO_PRESUPUESTO) return "excedido";
    if (pct >= UMBRAL_ALERTA_PRESUPUESTO) return "alerta";
    return "normal";
  }

  /** ¿Un monto adicional dado supera el disponible? Usado para exigir aprobación del Superadministrador. */
  public excedeDisponible(monto: number): boolean {
    return monto > this.disponible;
  }

  public toRow(): PresupuestoRow {
    return {
      id: this.id,
      rubro_id: this.rubroId,
      rubro_nombre: this.rubroNombre,
      area_id: this.areaId,
      area_nombre: this.areaNombre,
      anio: this.anio,
      mes: this.mes,
      monto_asignado: this.montoAsignado,
      monto_consumido: this.montoConsumido,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
