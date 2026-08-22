import type { EstadoCompra } from "@/domain/enums";

export interface CompraItemVM {
  id: string;
  requisicionItemId: string;
  productoNombre: string;
  unidadMedidaNombre: string;
  unidadMedidaAbreviatura: string | null;
  cantidad: number;
  precioUnitario: number;
  observacion: string | null;
}

export interface CompraVM {
  id: string;
  folioOc: string;
  requisicionId: string;
  requisicionFolio: string;
  requisicionDescripcion: string;
  proveedorNombre: string;
  montoTotal: number;
  excedePresupuesto: boolean;
  estado: EstadoCompra;
  fechaCompra: string;
  fechaEntregaEstimada: string | null;
  fechaCierre: string | null;
  diasParaEntrega: number | null;
  items: CompraItemVM[];
}

export interface ItemPendienteVM {
  id: string;
  productoNombre: string;
  rubroNombre: string;
  unidadMedidaNombre: string;
  unidadMedidaAbreviatura: string | null;
  cantidad: number;
  observacion: string | null;
}

export interface RequisicionDisponibleVM {
  id: string;
  folio: string;
  descripcion: string | null;
  areaNombre: string;
  ciudadOperacionNombre: string;
  itemsPendientes: ItemPendienteVM[];
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
