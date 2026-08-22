import type { RoleCode, ModuloCodigo } from "@/domain/enums";
import type { PermisoRow } from "@/domain/entities/PermisoMatriz";

export interface UsuarioVM {
  id: string;
  nombre: string;
  correo: string;
  areaId: string | null;
  areaNombre: string | null;
  roles: RoleCode[];
  activo: boolean;
  fotoUrl: string | null;
  permisos: PermisoRow[];
}

export interface OpcionCatalogo {
  id: string;
  nombre: string;
}

export interface ModuloOpcion {
  code: ModuloCodigo;
  label: string;
}

export interface PermisosUsuariosVM {
  puedeCrear: boolean;
  puedeActualizar: boolean;
}
