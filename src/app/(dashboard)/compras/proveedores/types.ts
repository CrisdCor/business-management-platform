import type { TipoCuentaBancaria } from "@/domain/enums";

export interface ProveedorVM {
  id: string;
  nitCedula: string;
  nombre: string;
  banco: string;
  tipoCuenta: TipoCuentaBancaria;
  numeroCuenta: string;
  activo: boolean;
}

export interface PermisosProveedoresVM {
  puedeCrear: boolean;
  puedeActualizar: boolean;
}
