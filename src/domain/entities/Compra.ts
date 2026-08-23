import { Entity, parseDate } from "@/domain/entities/Entity";
import { ESTADO_COMPRA, type EstadoCompra } from "@/domain/enums";

export interface CompraItemRow {
  id: string;
  compra_id: string;
  requisicion_item_id: string;
  precio_unitario: number;
  cantidad: number;
  observacion?: string | null;
  producto_nombre?: string | null;
  unidad_medida_nombre?: string | null;
  unidad_medida_abreviatura?: string | null;
  requisicion_id?: string | null;
  requisicion_folio?: string | null;
}

export interface CompraRow {
  id: string;
  folio_oc: string;
  proveedor_id: string;
  proveedor_nombre?: string | null;
  monto_total: number;
  excede_presupuesto: boolean;
  aprobado_superadmin_id: string | null;
  estado: EstadoCompra;
  fecha_compra: string;
  fecha_entrega_estimada: string | null;
  fecha_cierre: string | null;
  notas: string | null;
  items?: CompraItemRow[];
  created_at: string;
  updated_at: string;
}

/**
 * Orden de compra (OC). Representa la ejecución -- parcial o total -- de los
 * ítems de una requisición ya aprobada: una requisición puede tener varias
 * OC. Valida el estado frente al presupuesto por rubro, calcula si sigue
 * dentro del plazo comprometido con el proveedor y expone el estado que ven
 * Supervisor/Usuario mientras la gestión de compras hace seguimiento.
 */
export class Compra extends Entity<CompraRow> {
  private constructor(
    id: string,
    public readonly folioOc: string,
    public readonly proveedorId: string,
    public readonly proveedorNombre: string | null,
    public readonly montoTotal: number,
    public readonly excedePresupuesto: boolean,
    public readonly aprobadoSuperadminId: string | null,
    public readonly estado: EstadoCompra,
    public readonly fechaCompra: Date,
    public readonly fechaEntregaEstimada: Date | null,
    public readonly fechaCierre: Date | null,
    public readonly notas: string | null,
    public readonly items: CompraItemRow[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: CompraRow): Compra {
    return new Compra(
      row.id,
      row.folio_oc,
      row.proveedor_id,
      row.proveedor_nombre ?? null,
      Number(row.monto_total),
      row.excede_presupuesto,
      row.aprobado_superadmin_id,
      row.estado,
      parseDate(row.fecha_compra),
      row.fecha_entrega_estimada ? parseDate(row.fecha_entrega_estimada) : null,
      row.fecha_cierre ? parseDate(row.fecha_cierre) : null,
      row.notas,
      row.items ?? [],
      parseDate(row.created_at),
      parseDate(row.updated_at),
    );
  }

  /** Requiere aprobación del Superadministrador si excede el presupuesto y aún no ha sido aprobada. */
  public get requiereAprobacionSuperadmin(): boolean {
    return this.excedePresupuesto && !this.aprobadoSuperadminId;
  }

  public get estaCerrada(): boolean {
    return this.estado === ESTADO_COMPRA.CERRADA;
  }

  public get diasParaEntrega(): number | null {
    if (!this.fechaEntregaEstimada) return null;
    const ms = this.fechaEntregaEstimada.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  /** Folios de las requisiciones de origen tocadas por esta compra (puede cruzar varias, siempre que compartan área/ciudad). */
  public get foliosRequisiciones(): string[] {
    const folios = new Set<string>();
    for (const it of this.items) {
      if (it.requisicion_folio) folios.add(it.requisicion_folio);
    }
    return Array.from(folios);
  }

  public toRow(): CompraRow {
    return {
      id: this.id,
      folio_oc: this.folioOc,
      proveedor_id: this.proveedorId,
      proveedor_nombre: this.proveedorNombre,
      monto_total: this.montoTotal,
      excede_presupuesto: this.excedePresupuesto,
      aprobado_superadmin_id: this.aprobadoSuperadminId,
      estado: this.estado,
      fecha_compra: this.fechaCompra.toISOString(),
      fecha_entrega_estimada: this.fechaEntregaEstimada?.toISOString() ?? null,
      fecha_cierre: this.fechaCierre?.toISOString() ?? null,
      notas: this.notas,
      items: this.items,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
