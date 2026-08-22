import { Entity, parseDate } from "@/domain/entities/Entity";

export interface CiudadOperacionRow {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Catálogo de ciudades donde la compañía opera; se asigna a cada usuario. */
export class CiudadOperacion extends Entity<CiudadOperacionRow> {
  private constructor(
    id: string,
    public readonly nombre: string,
    public readonly activo: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: CiudadOperacionRow): CiudadOperacion {
    return new CiudadOperacion(row.id, row.nombre, row.activo, parseDate(row.created_at), parseDate(row.updated_at));
  }

  public toRow(): CiudadOperacionRow {
    return {
      id: this.id,
      nombre: this.nombre,
      activo: this.activo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
