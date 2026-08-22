/**
 * Enumeraciones centrales del dominio. Se mantienen como `const` + tipos
 * literales (en vez de `enum` de TypeScript) para que el valor coincida 1:1
 * con el `check constraint` / tipo `enum` de Postgres y sea trivial de
 * serializar en formularios y filtros.
 */

export const ROLES = {
  SUPERADMIN: "superadministrador",
  SUPERVISOR: "supervisor",
  USUARIO: "usuario",
  CONSULTOR: "consultor",
} as const;
export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleCode, string> = {
  [ROLES.SUPERADMIN]: "Superadministrador",
  [ROLES.SUPERVISOR]: "Supervisor",
  [ROLES.USUARIO]: "Usuario",
  [ROLES.CONSULTOR]: "Consultor",
};

/** Acciones CRUD que puede otorgar la matriz de permisos por módulo. */
export const PERMISOS = {
  CREAR: "crear",
  LEER: "leer",
  ACTUALIZAR: "actualizar",
  ELIMINAR: "eliminar",
} as const;
export type PermisoAccion = (typeof PERMISOS)[keyof typeof PERMISOS];

export const MODULOS = {
  COMPRAS_PRESUPUESTOS: "compras.presupuestos",
  COMPRAS_RUBROS: "compras.rubros",
  COMPRAS_REQUISICIONES: "compras.requisiciones",
  COMPRAS_COMPRAS: "compras.compras",
  COMPRAS_PROVEEDORES: "compras.proveedores",
  ADMIN_USUARIOS: "admin.usuarios",
  ADMIN_AREAS: "admin.areas",
  ADMIN_CIUDADES: "admin.ciudades",
  ADMIN_PERMISOS: "admin.permisos",
} as const;
export type ModuloCodigo = (typeof MODULOS)[keyof typeof MODULOS];

export const MODULO_LABELS: Record<ModuloCodigo, string> = {
  [MODULOS.COMPRAS_PRESUPUESTOS]: "Presupuestos",
  [MODULOS.COMPRAS_RUBROS]: "Rubros de compra",
  [MODULOS.COMPRAS_REQUISICIONES]: "Requisiciones",
  [MODULOS.COMPRAS_COMPRAS]: "Compras / OC",
  [MODULOS.COMPRAS_PROVEEDORES]: "Proveedores",
  [MODULOS.ADMIN_USUARIOS]: "Usuarios",
  [MODULOS.ADMIN_AREAS]: "Áreas",
  [MODULOS.ADMIN_CIUDADES]: "Ciudades de operación",
  [MODULOS.ADMIN_PERMISOS]: "Permisos",
};

export const ESTADO_REQUISICION = {
  PENDIENTE: "pendiente",
  APROBADA: "aprobada",
  RECHAZADA: "rechazada",
  EN_COMPRA: "en_compra",
  CERRADA: "cerrada",
} as const;
export type EstadoRequisicion =
  (typeof ESTADO_REQUISICION)[keyof typeof ESTADO_REQUISICION];

export const ESTADO_REQUISICION_LABELS: Record<EstadoRequisicion, string> = {
  [ESTADO_REQUISICION.PENDIENTE]: "Pendiente de aprobación",
  [ESTADO_REQUISICION.APROBADA]: "Aprobada",
  [ESTADO_REQUISICION.RECHAZADA]: "Rechazada",
  [ESTADO_REQUISICION.EN_COMPRA]: "En gestión de compra",
  [ESTADO_REQUISICION.CERRADA]: "Cerrada",
};

export const ESTADO_COMPRA = {
  PENDIENTE_APROBACION_EXCESO: "pendiente_aprobacion_exceso",
  EN_PROCESO: "en_proceso",
  ENVIADA: "enviada",
  CERRADA: "cerrada",
  VENCIDA: "vencida",
} as const;
export type EstadoCompra = (typeof ESTADO_COMPRA)[keyof typeof ESTADO_COMPRA];

export const ESTADO_COMPRA_LABELS: Record<EstadoCompra, string> = {
  [ESTADO_COMPRA.PENDIENTE_APROBACION_EXCESO]: "Pendiente aprobación (excede presupuesto)",
  [ESTADO_COMPRA.EN_PROCESO]: "En proceso",
  [ESTADO_COMPRA.ENVIADA]: "Enviada / en tránsito",
  [ESTADO_COMPRA.CERRADA]: "Cerrada",
  [ESTADO_COMPRA.VENCIDA]: "Vencida (fuera de plazo)",
};

export const TIPO_CUENTA_BANCARIA = {
  AHORROS: "ahorros",
  CORRIENTE: "corriente",
} as const;
export type TipoCuentaBancaria =
  (typeof TIPO_CUENTA_BANCARIA)[keyof typeof TIPO_CUENTA_BANCARIA];

/** Días hábiles/calendario que tiene el área administrativa para comprar tras la aprobación. */
export const PLAZO_COMPRA_DIAS = 2;

/** Umbrales de alerta de consumo de presupuesto (porcentaje). */
export const UMBRAL_ALERTA_PRESUPUESTO = 80;
export const UMBRAL_CRITICO_PRESUPUESTO = 100;
