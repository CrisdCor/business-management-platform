import { Entity, parseDate } from "@/domain/entities/Entity";
import { PermisoMatriz, type PermisoRow } from "@/domain/entities/PermisoMatriz";
import { ROLE_LABELS, type RoleCode } from "@/domain/enums";

export interface UsuarioRow {
  id: string;
  nombre: string;
  correo: string;
  area_id: string | null;
  area_nombre?: string | null;
  roles: RoleCode[];
  foto_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioProps {
  id: string;
  nombre: string;
  correo: string;
  areaId: string | null;
  areaNombre?: string | null;
  roles: RoleCode[];
  permisos: PermisoRow[];
  fotoUrl: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad de dominio Usuario. Agrupa identidad, rol(es), área y su matriz de
 * permisos, y expone las reglas de negocio que dependen de "quién es este
 * usuario" (p. ej. si puede aprobar una requisición) para que capas
 * superiores (servicios, UI) no dupliquen esa lógica.
 */
export class Usuario extends Entity<UsuarioRow> {
  public readonly nombre: string;
  public readonly correo: string;
  public readonly areaId: string | null;
  public readonly areaNombre: string | null;
  public readonly fotoUrl: string | null;
  public readonly activo: boolean;
  public readonly permisos: PermisoMatriz;

  private constructor(props: UsuarioProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.nombre = props.nombre;
    this.correo = props.correo;
    this.areaId = props.areaId;
    this.areaNombre = props.areaNombre ?? null;
    this.fotoUrl = props.fotoUrl;
    this.activo = props.activo;
    this.permisos = PermisoMatriz.desde(props.roles, props.permisos);
  }

  static crear(props: UsuarioProps): Usuario {
    return new Usuario(props);
  }

  static desdeFila(row: UsuarioRow, permisos: PermisoRow[]): Usuario {
    return new Usuario({
      id: row.id,
      nombre: row.nombre,
      correo: row.correo,
      areaId: row.area_id,
      areaNombre: row.area_nombre,
      roles: row.roles,
      permisos,
      fotoUrl: row.foto_url,
      activo: row.activo,
      createdAt: parseDate(row.created_at),
      updatedAt: parseDate(row.updated_at),
    });
  }

  public get iniciales(): string {
    return this.nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }

  public get etiquetaRoles(): string {
    return this.permisos.getRoles().map((r) => ROLE_LABELS[r]).join(" · ");
  }

  /** Un supervisor que crea su propia requisición la auto-aprueba; los demás roles requieren aprobación. */
  public requiereAprobacionParaRequisicion(): boolean {
    return !this.permisos.esSupervisor() && !this.permisos.esSuperadministrador();
  }

  public toRow(): UsuarioRow {
    return {
      id: this.id,
      nombre: this.nombre,
      correo: this.correo,
      area_id: this.areaId,
      area_nombre: this.areaNombre,
      roles: this.permisos.getRoles(),
      foto_url: this.fotoUrl,
      activo: this.activo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
