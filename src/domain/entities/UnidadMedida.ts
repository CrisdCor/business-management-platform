import { Entity, parseDate } from "@/domain/entities/Entity";

export interface UnidadMedidaRow {
  id: string;
  nombre: string;
  abreviatura: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Unidad de medida de un producto (unidad, caja, kg, litro...), configurada previamente en el catálogo. */
export class UnidadMedida extends Entity<UnidadMedidaRow> {
  private constructor(
    id: string,
    public readonly nombre: string,
    public readonly abreviatura: string | null,
    public readonly activo: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: UnidadMedidaRow): UnidadMedida {
    return new UnidadMedida(
      row.id,
      row.nombre,
      row.abreviatura,
      row.activo,
      parseDate(row.created_at),
      parseDate(row.updated_at),
    );
  }

  public toRow(): UnidadMedidaRow {
    return {
      id: this.id,
      nombre: this.nombre,
      abreviatura: this.abreviatura,
      activo: this.activo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
