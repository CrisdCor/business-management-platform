import { Entity, parseDate } from "@/domain/entities/Entity";
import type { TipoCuentaBancaria } from "@/domain/enums";

export interface ProveedorRow {
  id: string;
  nit_cedula: string;
  nombre: string;
  banco: string;
  tipo_cuenta: TipoCuentaBancaria;
  numero_cuenta: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export class Proveedor extends Entity<ProveedorRow> {
  private constructor(
    id: string,
    public readonly nitCedula: string,
    public readonly nombre: string,
    public readonly banco: string,
    public readonly tipoCuenta: TipoCuentaBancaria,
    public readonly numeroCuenta: string,
    public readonly activo: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  static desdeFila(row: ProveedorRow): Proveedor {
    return new Proveedor(
      row.id,
      row.nit_cedula,
      row.nombre,
      row.banco,
      row.tipo_cuenta,
      row.numero_cuenta,
      row.activo,
      parseDate(row.created_at),
      parseDate(row.updated_at),
    );
  }

  public get datosPago(): string {
    return `${this.banco} · ${this.tipoCuenta} · ${this.numeroCuenta}`;
  }

  public toRow(): ProveedorRow {
    return {
      id: this.id,
      nit_cedula: this.nitCedula,
      nombre: this.nombre,
      banco: this.banco,
      tipo_cuenta: this.tipoCuenta,
      numero_cuenta: this.numeroCuenta,
      activo: this.activo,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
