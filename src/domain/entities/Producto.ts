import { Entity, parseDate } from "@/domain/entities/Entity";

export interface ProductoRow {
  id: string;
  nombre: string;
  rubro_id: string;
  rubro_nombre?: string | null;
  unidad_medida_id: string;
  unidad_medida_nombre?: string | null;
  unidad_medida_abreviatura?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Producto del catálogo de compras. Trae por configuración previa el rubro y
 * la unidad de medida, de forma que quien levanta una requisición solo
 * captura producto + cantidad + observación -- nunca el rubro ni la unidad.
 */
export class Producto extends Entity<ProductoRow> {
  private constructor(
    id: string,
    public readonly nombre: string,
    public readonly rubroId: string,
    public readonly rubroNombre: string | null,
    public readonly unidadMedidaId: string,
    public readonly unidadMedidaNombre: string | null,
    public readonly unidadMedidaAbreviatura: string | null,
    public readonly activo: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: ProductoRow): Producto {
    return new Producto(
      row.id,
      row.nombre,
      row.rubro_id,
      row.rubro_nombre ?? null,
      row.unidad_medida_id,
      row.unidad_medida_nombre ?? null,
      row.unidad_medida_abreviatura ?? null,
      row.activo,
      parseDate(row.created_at),
      parseDate(row.updated_at),
    );
  }

  public toRow(): ProductoRow {
    return {
      id: this.id,
      nombre: this.nombre,
      rubro_id: this.rubroId,
      rubro_nombre: this.rubroNombre,
      unidad_medida_id: this.unidadMedidaId,
      unidad_medida_nombre: this.unidadMedidaNombre,
      unidad_medida_abreviatura: this.unidadMedidaAbreviatura,
      activo: this.activo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
