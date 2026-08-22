import type { EstadoCompra } from "@/domain/enums";

export interface CompraVM {
  id: string;
  folioOc: string;
  requisicionId: string;
  requisicionFolio: string;
  requisicionDescripcion: string;
  proveedorNombre: string;
  monto: number;
  excedePresupuesto: boolean;
  estado: EstadoCompra;
  fechaCompra: string;
  fechaEntregaEstimada: string | null;
  fechaCierre: string | null;
  diasParaEntrega: number | null;
}

export interface RequisicionDisponibleVM {
  id: string;
  folio: string;
  descripcion: string;
  montoEstimado: number;
  areaNombre: string;
  rubroNombre: string;
}

export interface ProveedorOpcionVM {
  id: string;
  nombre: string;
  nitCedula: string;
}

export interface PermisosOrdenesVM {
  puedeRegistrar: boolean;
  puedeGestionar: boolean;
  esSuperadministrador: boolean;
}
