import { Entity, parseDate } from "@/domain/entities/Entity";

export interface RubroRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Rubro de compra (insumos de bodega, insumos de oficina, caja menor, etc.), catálogo gestionado por el Superadministrador. */
export class Rubro extends Entity<RubroRow> {
  private constructor(
    id: string,
    public readonly nombre: string,
    public readonly descripcion: string | null,
    public readonly activo: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: RubroRow): Rubro {
    return new Rubro(
      row.id,
      row.nombre,
      row.descripcion,
      row.activo,
      parseDate(row.created_at),
      parseDate(row.updated_at),
    );
  }

  public toRow(): RubroRow {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      activo: this.activo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
