import { Entity, parseDate } from "@/domain/entities/Entity";
import { ESTADO_REQUISICION, PLAZO_COMPRA_DIAS, type EstadoRequisicion } from "@/domain/enums";

export interface RequisicionItemRow {
  id: string;
  requisicion_id: string;
  producto_id: string;
  producto_nombre?: string | null;
  rubro_id: string;
  rubro_nombre?: string | null;
  unidad_medida_id: string;
  unidad_medida_nombre?: string | null;
  unidad_medida_abreviatura?: string | null;
  cantidad: number;
  observacion: string | null;
  cantidad_comprada: number;
  cantidad_anulada: number;
  cantidad_pendiente: number;
  motivo_anulacion: string | null;
}

export type EstadoSemaforo = "verde" | "amarillo" | "rojo" | null;

export interface RequisicionRow {
  id: string;
  folio: string;
  area_id: string;
  area_nombre?: string | null;
  ciudad_operacion_id: string | null;
  ciudad_operacion_nombre?: string | null;
  solicitante_id: string;
  solicitante_nombre?: string | null;
  solicitante_supervisor_id?: string | null;
  descripcion: string | null;
  estado: EstadoRequisicion;
  aprobador_id: string | null;
  aprobador_nombre?: string | null;
  fecha_aprobacion: string | null;
  motivo_rechazo: string | null;
  items?: RequisicionItemRow[];
  created_at: string;
  updated_at: string;
}

/**
 * Requisición de compra por ítems (producto + cantidad + observación). El
 * área y la ciudad de operación son un snapshot del perfil del solicitante al
 * momento de crearla (no editables); el valor/monto no vive aquí -- aparece
 * cuando administración registra la Orden de Compra a partir de los ítems.
 */
export class Requisicion extends Entity<RequisicionRow> {
  private constructor(
    id: string,
    public readonly folio: string,
    public readonly areaId: string,
    public readonly areaNombre: string | null,
    public readonly ciudadOperacionId: string | null,
    public readonly ciudadOperacionNombre: string | null,
    public readonly solicitanteId: string,
    public readonly solicitanteNombre: string | null,
    public readonly solicitanteSupervisorId: string | null,
    public readonly descripcion: string | null,
    public readonly estado: EstadoRequisicion,
    public readonly aprobadorId: string | null,
    public readonly aprobadorNombre: string | null,
    public readonly fechaAprobacion: Date | null,
    public readonly motivoRechazo: string | null,
    public readonly items: RequisicionItemRow[],
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
      row.ciudad_operacion_id,
      row.ciudad_operacion_nombre ?? null,
      row.solicitante_id,
      row.solicitante_nombre ?? null,
      row.solicitante_supervisor_id ?? null,
      row.descripcion,
      row.estado,
      row.aprobador_id,
      row.aprobador_nombre ?? null,
      row.fecha_aprobacion ? parseDate(row.fecha_aprobacion) : null,
      row.motivo_rechazo,
      row.items ?? [],
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

  /** Solo el dueño (o el Superadministrador) puede editar, y solo mientras siga 'pendiente' -- sin reversión posible tras aprobarse. */
  public puedeEditar(usuarioId: string, esSuperadmin: boolean): boolean {
    return this.estaPendiente && (this.solicitanteId === usuarioId || esSuperadmin);
  }

  /**
   * Solo el Superadministrador, o el supervisor asignado exactamente a este
   * solicitante (organigrama persona-a-persona, no el rol "supervisor" en
   * general), y solo mientras siga 'pendiente'.
   */
  public puedeAprobar(usuarioId: string, esSuperadmin: boolean, esSupervisor: boolean): boolean {
    if (!this.estaPendiente) return false;
    if (esSuperadmin) return true;
    return esSupervisor && this.solicitanteSupervisorId !== null && this.solicitanteSupervisorId === usuarioId;
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

  /**
   * Semáforo de vencimiento para que administración priorice la gestión de
   * compra: verde con más de un día de margen, amarillo en el último día,
   * rojo si ya venció el plazo. `null` fuera del estado "aprobada" (donde el
   * plazo no aplica todavía o ya no aplica).
   */
  public get estadoSemaforo(): EstadoSemaforo {
    if (!this.estaAprobada) return null;
    const dias = this.diasRestantesParaComprar;
    if (dias === null) return null;
    if (dias < 0) return "rojo";
    if (dias <= 1) return "amarillo";
    return "verde";
  }

  public toRow(): RequisicionRow {
    return {
      id: this.id,
      folio: this.folio,
      area_id: this.areaId,
      area_nombre: this.areaNombre,
      ciudad_operacion_id: this.ciudadOperacionId,
      ciudad_operacion_nombre: this.ciudadOperacionNombre,
      solicitante_id: this.solicitanteId,
      solicitante_nombre: this.solicitanteNombre,
      solicitante_supervisor_id: this.solicitanteSupervisorId,
      descripcion: this.descripcion,
      estado: this.estado,
      aprobador_id: this.aprobadorId,
      aprobador_nombre: this.aprobadorNombre,
      fecha_aprobacion: this.fechaAprobacion?.toISOString() ?? null,
      motivo_rechazo: this.motivoRechazo,
      items: this.items,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
