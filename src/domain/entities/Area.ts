import { Entity, parseDate } from "@/domain/entities/Entity";

export interface AreaRow {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export class Area extends Entity<AreaRow> {
  private constructor(
    id: string,
    public readonly nombre: string,
    public readonly activo: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: AreaRow): Area {
    return new Area(row.id, row.nombre, row.activo, parseDate(row.created_at), parseDate(row.updated_at));
  }

  public toRow(): AreaRow {
    return {
      id: this.id,
      nombre: this.nombre,
      activo: this.activo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
