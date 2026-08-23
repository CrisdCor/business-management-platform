import type { EstadoCompra } from "@/domain/enums";

export interface CompraItemVM {
  id: string;
  requisicionItemId: string;
  requisicionId: string;
  requisicionFolio: string;
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
  requisicionesFolios: string[];
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

/** Ítem con saldo pendiente (de cualquier requisición aprobada/en_compra), aplanado con los datos de su requisición de origen para armar una OC que puede cruzar varias requisiciones (misma área/ciudad). */
export interface ItemPendienteCompraVM {
  id: string;
  requisicionId: string;
  requisicionFolio: string;
  areaId: string;
  areaNombre: string;
  ciudadOperacionId: string | null;
  ciudadOperacionNombre: string;
  productoNombre: string;
  rubroNombre: string;
  unidadMedidaNombre: string;
  unidadMedidaAbreviatura: string | null;
  cantidadPendiente: number;
  observacion: string | null;
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
