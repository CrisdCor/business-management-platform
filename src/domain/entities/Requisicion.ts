import { Entity, parseDate } from "@/domain/entities/Entity";
import { ESTADO_REQUISICION, PLAZO_COMPRA_DIAS, type EstadoRequisicion } from "@/domain/enums";

export interface RequisicionRow {
  id: string;
  folio: string;
  area_id: string;
  area_nombre?: string | null;
  rubro_id: string;
  rubro_nombre?: string | null;
  presupuesto_id: string;
  solicitante_id: string;
  solicitante_nombre?: string | null;
  descripcion: string;
  monto_estimado: number;
  estado: EstadoRequisicion;
  aprobador_id: string | null;
  aprobador_nombre?: string | null;
  fecha_aprobacion: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Requisición de compra. Concentra el flujo de aprobación descrito por el
 * negocio: auto-aprobada cuando la crea un Supervisor, pendiente de
 * aprobación cuando la crea un Usuario, y con un plazo derivado para que
 * el área administrativa gestione la compra una vez aprobada.
 */
export class Requisicion extends Entity<RequisicionRow> {
  private constructor(
    id: string,
    public readonly folio: string,
    public readonly areaId: string,
    public readonly areaNombre: string | null,
    public readonly rubroId: string,
    public readonly rubroNombre: string | null,
    public readonly presupuestoId: string,
    public readonly solicitanteId: string,
    public readonly solicitanteNombre: string | null,
    public readonly descripcion: string,
    public readonly montoEstimado: number,
    public readonly estado: EstadoRequisicion,
    public readonly aprobadorId: string | null,
    public readonly aprobadorNombre: string | null,
    public readonly fechaAprobacion: Date | null,
    public readonly motivoRechazo: string | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: RequisicionRow): Requisicion {
    return new Requisicion(
      row.id,
      row.folio,
      row.area_id,
      row.area_nombre ?? null,
      row.rubro_id,
      row.rubro_nombre ?? null,
      row.presupuesto_id,
      row.solicitante_id,
      row.solicitante_nombre ?? null,
      row.descripcion,
      Number(row.monto_estimado),
      row.estado,
      row.aprobador_id,
      row.aprobador_nombre ?? null,
      row.fecha_aprobacion ? parseDate(row.fecha_aprobacion) : null,
      row.motivo_rechazo,
      parseDate(row.created_at),
      parseDate(row.updated_at),
    );
  }

  public get estaPendiente(): boolean {
    return this.estado === ESTADO_REQUISICION.PENDIENTE;
  }

  public get estaAprobada(): boolean {
    return this.estado === ESTADO_REQUISICION.APROBADA;
  }

  /** Fecha límite para que el área administrativa gestione la compra tras la aprobación. */
  public get fechaLimiteCompra(): Date | null {
    if (!this.fechaAprobacion) return null;
    const limite = new Date(this.fechaAprobacion);
    limite.setDate(limite.getDate() + PLAZO_COMPRA_DIAS);
    return limite;
  }

  public get diasRestantesParaComprar(): number | null {
    const limite = this.fechaLimiteCompra;
    if (!limite) return null;
    const ms = limite.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  public get plazoVencido(): boolean {
    const dias = this.diasRestantesParaComprar;
    return this.estaAprobada && dias !== null && dias < 0;
  }

  public toRow(): RequisicionRow {
    return {
      id: this.id,
      folio: this.folio,
      area_id: this.areaId,
      area_nombre: this.areaNombre,
      rubro_id: this.rubroId,
      rubro_nombre: this.rubroNombre,
      presupuesto_id: this.presupuestoId,
      solicitante_id: this.solicitanteId,
      solicitante_nombre: this.solicitanteNombre,
      descripcion: this.descripcion,
      monto_estimado: this.montoEstimado,
      estado: this.estado,
      aprobador_id: this.aprobadorId,
      aprobador_nombre: this.aprobadorNombre,
      fecha_aprobacion: this.fechaAprobacion?.toISOString() ?? null,
      motivo_rechazo: this.motivoRechazo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
