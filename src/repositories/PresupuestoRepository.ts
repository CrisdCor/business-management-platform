import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Presupuesto, type PresupuestoRow } from "@/domain/entities/Presupuesto";

interface PresupuestoQueryRow extends PresupuestoRow {
  rubro?: { nombre: string } | null;
  area?: { nombre: string } | null;
  ciudad_operacion?: { nombre: string } | null;
}

export class PresupuestoRepository extends BaseRepository<Presupuesto, PresupuestoQueryRow> {
  constructor(client: SupabaseClient) {
    super(client, "presupuestos");
  }

  protected override get select(): string {
    return "*, rubro:rubros(nombre), area:areas(nombre), ciudad_operacion:ciudades_operacion(nombre)";
  }

  protected mapRow(row: PresupuestoQueryRow): Presupuesto {
    return Presupuesto.desdeFila({
      ...row,
      rubro_nombre: row.rubro?.nombre ?? null,
      area_nombre: row.area?.nombre ?? null,
      ciudad_operacion_nombre: row.ciudad_operacion?.nombre ?? null,
    });
  }

  /** Presupuesto vigente para un rubro+área+ciudad en un periodo dado (mes/año). */
  async buscarPorPeriodo(
    rubroId: string,
    areaId: string,
    ciudadOperacionId: string,
    anio: number,
    mes: number,
  ): Promise<Presupuesto | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select(this.select)
      .eq("rubro_id", rubroId)
      .eq("area_id", areaId)
      .eq("ciudad_operacion_id", ciudadOperacionId)
      .eq("anio", anio)
      .eq("mes", mes)
      .maybeSingle();
    if (error) throw new Error(`[presupuestos] buscarPorPeriodo: ${error.message}`);
    return data ? this.mapRow(data as unknown as PresupuestoQueryRow) : null;
  }

  async listarPorPeriodo(anio: number, mes: number): Promise<Presupuesto[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select(this.select)
      .eq("anio", anio)
      .eq("mes", mes)
      .order("area_id");
    if (error) throw new Error(`[presupuestos] listarPorPeriodo: ${error.message}`);
    return (data as unknown as PresupuestoQueryRow[]).map((r) => this.mapRow(r));
  }
}
