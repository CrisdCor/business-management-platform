import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Proveedor, type ProveedorRow } from "@/domain/entities/Proveedor";

export class ProveedorRepository extends BaseRepository<Proveedor, ProveedorRow> {
  constructor(client: SupabaseClient) {
    super(client, "proveedores");
  }

  protected mapRow(row: ProveedorRow): Proveedor {
    return Proveedor.desdeFila(row);
  }
}
