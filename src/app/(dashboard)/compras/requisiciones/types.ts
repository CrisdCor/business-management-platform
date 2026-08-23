import type { EstadoRequisicion } from "@/domain/enums";
import type { EstadoSemaforo } from "@/domain/entities/Requisicion";

export interface RequisicionItemVM {
  id: string;
  productoId: string;
  productoNombre: string;
  rubroNombre: string;
  unidadMedidaNombre: string;
  unidadMedidaAbreviatura: string | null;
  cantidad: number;
  observacion: string | null;
  cantidadComprada: number;
  cantidadAnulada: number;
  cantidadPendiente: number;
  motivoAnulacion: string | null;
}

export interface RequisicionVM {
  id: string;
  folio: string;
  areaNombre: string;
  ciudadOperacionNombre: string;
  descripcion: string | null;
  estado: EstadoRequisicion;
  solicitanteId: string;
  solicitanteNombre: string;
  aprobadorNombre: string | null;
  motivoRechazo: string | null;
  fechaAprobacion: string | null;
  diasRestantesParaComprar: number | null;
  plazoVencido: boolean;
  estadoSemaforo: EstadoSemaforo;
  puedeEditar: boolean;
  puedeAprobar: boolean;
  items: RequisicionItemVM[];
  createdAt: string;
}

export interface OpcionCatalogo {
  id: string;
  nombre: string;
}

export interface ProductoOpcionVM {
  id: string;
  nombre: string;
  rubroNombre: string;
  unidadMedidaNombre: string;
  unidadMedidaAbreviatura: string | null;
}

export interface PermisosRequisicionesVM {
  puedeCrear: boolean;
  puedeRechazar: boolean;
}

export interface SolicitanteVM {
  areaNombre: string;
  ciudadOperacionNombre: string;
}
