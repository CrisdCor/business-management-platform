import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Compra, type CompraRow } from "@/domain/entities/Compra";
import type { EstadoCompra } from "@/domain/enums";

interface CompraQueryRow extends CompraRow {
  proveedor?: { nombre: string } | null;
}

export interface CompraFiltros {
  estado?: EstadoCompra;
}

export class CompraRepository extends BaseRepository<Compra, CompraQueryRow> {
  constructor(client: SupabaseClient) {
    super(client, "compras");
  }

  protected override get select(): string {
    return "*, proveedor:proveedores(nombre)";
  }

  protected mapRow(row: CompraQueryRow): Compra {
    return Compra.desdeFila({ ...row, proveedor_nombre: row.proveedor?.nombre ?? null });
  }

  async listar(filtros: CompraFiltros = {}): Promise<Compra[]> {
    let query = this.client.from(this.table).select(this.select);
    if (filtros.estado) query = query.eq("estado", filtros.estado);
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`[compras] listar: ${error.message}`);
    return (data as unknown as CompraQueryRow[]).map((r) => this.mapRow(r));
  }

  async buscarPorRequisicion(requisicionId: string): Promise<Compra | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select(this.select)
      .eq("requisicion_id", requisicionId)
      .maybeSingle();
    if (error) throw new Error(`[compras] buscarPorRequisicion: ${error.message}`);
    return data ? this.mapRow(data as unknown as CompraQueryRow) : null;
  }
}
