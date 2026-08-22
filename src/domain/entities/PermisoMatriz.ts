import { MODULOS, PERMISOS, ROLES, type ModuloCodigo, type PermisoAccion, type RoleCode } from "@/domain/enums";

/** Conjunto de acciones permitidas para un módulo puntual. */
export type AccesoModulo = Record<PermisoAccion, boolean>;

/** Fila cruda tal como se almacena en `usuario_permisos` (una fila por módulo). */
export interface PermisoRow {
  modulo: ModuloCodigo;
  crear: boolean;
  leer: boolean;
  actualizar: boolean;
  eliminar: boolean;
}

function sinAcceso(): AccesoModulo {
  return { crear: false, leer: false, actualizar: false, eliminar: false };
}

function accesoTotal(): AccesoModulo {
  return { crear: true, leer: true, actualizar: true, eliminar: true };
}

function soloLectura(): AccesoModulo {
  return { crear: false, leer: true, actualizar: false, eliminar: false };
}

/**
 * Value object que representa la matriz de módulo × acción de un usuario.
 *
 * Encapsula la regla de negocio "¿puede este usuario hacer X en el módulo Y?"
 * en un único lugar, para que ni la UI ni las rutas de API tengan que
 * reimplementar la lógica de permisos. Se construye a partir de los roles
 * del usuario y de sus overrides por módulo guardados en base de datos.
 */
export class PermisoMatriz {
  private readonly accesos: Map<ModuloCodigo, AccesoModulo>;

  private constructor(
    private readonly roles: RoleCode[],
    accesos: Map<ModuloCodigo, AccesoModulo>,
  ) {
    this.accesos = accesos;
  }

  static desde(roles: RoleCode[], filas: PermisoRow[]): PermisoMatriz {
    const accesos = new Map<ModuloCodigo, AccesoModulo>();
    for (const fila of filas) {
      accesos.set(fila.modulo, {
        crear: fila.crear,
        leer: fila.leer,
        actualizar: fila.actualizar,
        eliminar: fila.eliminar,
      });
    }
    return new PermisoMatriz(roles, accesos);
  }

  /** Matriz de solo-lectura útil para el rol Consultor por defecto. */
  static soloLecturaGlobal(roles: RoleCode[]): PermisoMatriz {
    const accesos = new Map<ModuloCodigo, AccesoModulo>();
    for (const modulo of Object.values(MODULOS)) {
      accesos.set(modulo, soloLectura());
    }
    return new PermisoMatriz(roles, accesos);
  }

  public esSuperadministrador(): boolean {
    return this.roles.includes(ROLES.SUPERADMIN);
  }

  public esSupervisor(): boolean {
    return this.roles.includes(ROLES.SUPERVISOR);
  }

  public tieneRol(rol: RoleCode): boolean {
    return this.roles.includes(rol);
  }

  public getRoles(): RoleCode[] {
    return [...this.roles];
  }

  /** El superadministrador siempre tiene acceso total, sin importar la matriz guardada. */
  public accesoA(modulo: ModuloCodigo): AccesoModulo {
    if (this.esSuperadministrador()) return accesoTotal();
    return this.accesos.get(modulo) ?? sinAcceso();
  }

  public puede(modulo: ModuloCodigo, accion: PermisoAccion): boolean {
    return this.accesoA(modulo)[accion];
  }

  public puedeCrear(modulo: ModuloCodigo): boolean {
    return this.puede(modulo, PERMISOS.CREAR);
  }

  public puedeLeer(modulo: ModuloCodigo): boolean {
    return this.puede(modulo, PERMISOS.LEER);
  }

  public puedeActualizar(modulo: ModuloCodigo): boolean {
    return this.puede(modulo, PERMISOS.ACTUALIZAR);
  }

  public puedeEliminar(modulo: ModuloCodigo): boolean {
    return this.puede(modulo, PERMISOS.ELIMINAR);
  }

  /** Módulos donde el usuario tiene al menos permiso de lectura (para armar el menú). */
  public modulosVisibles(): ModuloCodigo[] {
    if (this.esSuperadministrador()) return Object.values(MODULOS);
    return Object.values(MODULOS).filter((m) => this.puedeLeer(m));
  }

  public toRows(): PermisoRow[] {
    return Array.from(this.accesos.entries()).map(([modulo, acceso]) => ({
      modulo,
      ...acceso,
    }));
  }
}
