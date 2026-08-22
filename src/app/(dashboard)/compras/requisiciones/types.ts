import type { EstadoRequisicion } from "@/domain/enums";

export interface RequisicionVM {
  id: string;
  folio: string;
  areaId: string;
  areaNombre: string;
  rubroId: string;
  rubroNombre: string;
  descripcion: string;
  montoEstimado: number;
  estado: EstadoRequisicion;
  solicitanteNombre: string;
  aprobadorNombre: string | null;
  diasRestantesParaComprar: number | null;
  plazoVencido: boolean;
  tieneCompraRegistrada: boolean;
  createdAt: string;
}

export interface OpcionCatalogo {
  id: string;
  nombre: string;
}

export interface PermisosRequisicionesVM {
  puedeCrear: boolean;
  puedeAprobar: boolean;
}
