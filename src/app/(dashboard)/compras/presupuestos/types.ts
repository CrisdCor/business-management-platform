export interface PresupuestoVM {
  id: string;
  rubroId: string;
  rubroNombre: string;
  areaId: string;
  areaNombre: string;
  ciudadOperacionId: string;
  ciudadOperacionNombre: string;
  anio: number;
  mes: number;
  montoAsignado: number;
  montoConsumido: number;
  disponible: number;
  porcentajeConsumido: number;
  nivelAlerta: "normal" | "alerta" | "excedido";
}

export interface OpcionCatalogo {
  id: string;
  nombre: string;
}

export interface PermisosPresupuestosVM {
  puedeAsignar: boolean;
  puedeAjustar: boolean;
}
