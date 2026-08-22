import { Entity, parseDate } from "@/domain/entities/Entity";

export interface NotificacionRow {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  entidad_tipo: string | null;
  entidad_id: string | null;
  created_at: string;
}

/** Notificación dentro de la app (sin correo). Se crea solo desde las RPC de aprobar/rechazar requisiciones. */
export class Notificacion extends Entity<NotificacionRow> {
  private constructor(
    id: string,
    public readonly usuarioId: string,
    public readonly titulo: string,
    public readonly mensaje: string,
    public readonly leida: boolean,
    public readonly entidadTipo: string | null,
    public readonly entidadId: string | null,
    createdAt: Date,
  ) {
    super(id, createdAt, createdAt);
  }

  static desdeFila(row: NotificacionRow): Notificacion {
    return new Notificacion(
      row.id,
      row.usuario_id,
      row.titulo,
      row.mensaje,
      row.leida,
      row.entidad_tipo,
      row.entidad_id,
      parseDate(row.created_at),
    );
  }

  public toRow(): NotificacionRow {
    return {
      id: this.id,
      usuario_id: this.usuarioId,
      titulo: this.titulo,
      mensaje: this.mensaje,
      leida: this.leida,
      entidad_tipo: this.entidadTipo,
      entidad_id: this.entidadId,
      created_at: this.createdAt.toISOString(),
    };
  }
}
