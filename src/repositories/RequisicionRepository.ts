import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Requisicion, type RequisicionRow, type RequisicionItemRow } from "@/domain/entities/Requisicion";
import type { EstadoRequisicion } from "@/domain/enums";

interface RequisicionItemQueryRow {
  id: string;
  requisicion_id: string;
  producto_id: string;
  rubro_id: string;
  unidad_medida_id: string;
  cantidad: number;
  observacion: string | null;
  comprado: boolean;
  producto?: { nombre: string } | null;
  rubro?: { nombre: string } | null;
  unidad_medida?: { nombre: string; abreviatura: string | null } | null;
}

interface RequisicionQueryRow extends RequisicionRow {
  area?: { nombre: string } | null;
  ciudad_operacion?: { nombre: string } | null;
  solicitante?: { nombre: string } | null;
  aprobador?: { nombre: string } | null;
  requisicion_items?: RequisicionItemQueryRow[];
}

export interface RequisicionFiltros {
  estado?: EstadoRequisicion;
  areaId?: string;
  solicitanteId?: string;
}

const SELECT_CON_RELACIONES =
  "*, area:areas(nombre), ciudad_operacion:ciudades_operacion(nombre), " +
  "solicitante:usuarios!requisiciones_solicitante_id_fkey(nombre), aprobador:usuarios!requisiciones_aprobador_id_fkey(nombre), " +
  "requisicion_items(*, producto:productos(nombre), rubro:rubros(nombre), unidad_medida:unidades_medida(nombre, abreviatura))";

export class RequisicionRepository extends BaseRepository<Requisicion, RequisicionQueryRow> {
  constructor(client: SupabaseClient) {
    super(client, "requisiciones");
  }

  protected override get select(): string {
    return SELECT_CON_RELACIONES;
  }

  protected mapRow(row: RequisicionQueryRow): Requisicion {
    const items: RequisicionItemRow[] =
      row.requisicion_items?.map((it) => ({
        id: it.id,
        requisicion_id: it.requisicion_id,
        producto_id: it.producto_id,
        producto_nombre: it.producto?.nombre ?? null,
        rubro_id: it.rubro_id,
        rubro_nombre: it.rubro?.nombre ?? null,
        unidad_medida_id: it.unidad_medida_id,
        unidad_medida_nombre: it.unidad_medida?.nombre ?? null,
        unidad_medida_abreviatura: it.unidad_medida?.abreviatura ?? null,
        cantidad: Number(it.cantidad),
        observacion: it.observacion,
        comprado: it.comprado,
      })) ?? [];

    return Requisicion.desdeFila({
      ...row,
      area_nombre: row.area?.nombre ?? null,
      ciudad_operacion_nombre: row.ciudad_operacion?.nombre ?? null,
      solicitante_nombre: row.solicitante?.nombre ?? null,
      aprobador_nombre: row.aprobador?.nombre ?? null,
      items,
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

  /**
   * Crea la requisición y sus ítems en una sola transacción atómica vía la
   * función RPC `crear_requisicion` -- el área/ciudad/solicitante/estado los
   * fija un trigger de base de datos, nunca el cliente.
   */
  async crearConItems(input: {
    descripcion: string | null;
    items: { productoId: string; cantidad: number; observacion: string | null }[];
  }): Promise<Requisicion> {
    const { data: id, error } = await this.client.rpc("crear_requisicion", {
      p_items: input.items.map((i) => ({
        producto_id: i.productoId,
        cantidad: i.cantidad,
        observacion: i.observacion,
      })),
      p_descripcion: input.descripcion,
    });
    if (error) throw new Error(`[requisiciones] crear_requisicion: ${error.message}`);

    const creada = await this.findById(id as string);
    if (!creada) throw new Error("La requisición se creó pero no se pudo leer de vuelta.");
    return creada;
  }

  /** Aprueba la requisición vía la RPC `aprobar_requisicion` (exige rol Supervisor o Superadministrador). */
  async aprobar(id: string): Promise<Requisicion> {
    const { error } = await this.client.rpc("aprobar_requisicion", { p_id: id });
    if (error) throw new Error(`[requisiciones] aprobar_requisicion: ${error.message}`);

    const actualizada = await this.findById(id);
    if (!actualizada) throw new Error("Requisición no encontrada tras aprobarla.");
    return actualizada;
  }

  /** Rechaza la requisición vía la RPC `rechazar_requisicion` (exige rol Superadministrador). */
  async rechazar(id: string, motivo: string): Promise<Requisicion> {
    const { error } = await this.client.rpc("rechazar_requisicion", { p_id: id, p_motivo: motivo });
    if (error) throw new Error(`[requisiciones] rechazar_requisicion: ${error.message}`);

    const actualizada = await this.findById(id);
    if (!actualizada) throw new Error("Requisición no encontrada tras rechazarla.");
    return actualizada;
  }
}
