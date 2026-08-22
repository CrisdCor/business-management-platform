import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Producto, type ProductoRow } from "@/domain/entities/Producto";

interface ProductoQueryRow extends ProductoRow {
  rubro?: { nombre: string } | null;
  unidad_medida?: { nombre: string; abreviatura: string | null } | null;
}

export class ProductoRepository extends BaseRepository<Producto, ProductoQueryRow> {
  constructor(client: SupabaseClient) {
    super(client, "productos");
  }

  protected override get select(): string {
    return "*, rubro:rubros(nombre), unidad_medida:unidades_medida(nombre, abreviatura)";
  }

  protected mapRow(row: ProductoQueryRow): Producto {
    return Producto.desdeFila({
      ...row,
      rubro_nombre: row.rubro?.nombre ?? null,
      unidad_medida_nombre: row.unidad_medida?.nombre ?? null,
      unidad_medida_abreviatura: row.unidad_medida?.abreviatura ?? null,
    });
  }
}
