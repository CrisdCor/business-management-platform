import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Requisicion, type RequisicionRow } from "@/domain/entities/Requisicion";
import type { EstadoRequisicion } from "@/domain/enums";

interface RequisicionQueryRow extends RequisicionRow {
  area?: { nombre: string } | null;
  rubro?: { nombre: string } | null;
  solicitante?: { nombre: string } | null;
  aprobador?: { nombre: string } | null;
}

export interface RequisicionFiltros {
  estado?: EstadoRequisicion;
  areaId?: string;
  solicitanteId?: string;
}

const SELECT_CON_RELACIONES =
  "*, area:areas(nombre), rubro:rubros(nombre), solicitante:usuarios!requisiciones_solicitante_id_fkey(nombre), aprobador:usuarios!requisiciones_aprobador_id_fkey(nombre)";

export class RequisicionRepository extends BaseRepository<Requisicion, RequisicionQueryRow> {
  constructor(client: SupabaseClient) {
    super(client, "requisiciones");
  }

  protected override get select(): string {
    return SELECT_CON_RELACIONES;
  }

  protected mapRow(row: RequisicionQueryRow): Requisicion {
    return Requisicion.desdeFila({
      ...row,
      area_nombre: row.area?.nombre ?? null,
      rubro_nombre: row.rubro?.nombre ?? null,
      solicitante_nombre: row.solicitante?.nombre ?? null,
      aprobador_nombre: row.aprobador?.nombre ?? null,
    });
  }

  async listar(filtros: RequisicionFiltros = {}): Promise<Requisicion[]> {
    let query = this.client.from(this.table).select(this.select);
    if (filtros.estado) query = query.eq("estado", filtros.estado);
    if (filtros.areaId) query = query.eq("area_id", filtros.areaId);
    if (filtros.solicitanteId) query = query.eq("solicitante_id", filtros.solicitanteId);
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`[requisiciones] listar: ${error.message}`);
    return (data as unknown as RequisicionQueryRow[]).map((r) => this.mapRow(r));
  }
}
