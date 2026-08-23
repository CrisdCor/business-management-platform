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
  cantidad_comprada: number;
  cantidad_anulada: number;
  cantidad_pendiente: number;
  motivo_anulacion: string | null;
  producto?: { nombre: string } | null;
  rubro?: { nombre: string } | null;
  unidad_medida?: { nombre: string; abreviatura: string | null } | null;
}

interface RequisicionQueryRow extends RequisicionRow {
  area?: { nombre: string } | null;
  ciudad_operacion?: { nombre: string } | null;
  solicitante?: { nombre: string; supervisor_id: string | null } | null;
  aprobador?: { nombre: string } | null;
  requisicion_items?: RequisicionItemQueryRow[];
}

export interface RequisicionFiltros {
  estado?: EstadoRequisicion;
  areaId?: string;
  solicitanteId?: string;
}

/** Ítem pendiente de compra (saldo > 0), aplanado con los datos de su requisición de origen -- usado por Compras para armar una OC cruzando varias requisiciones. */
export interface ItemPendienteCompra {
  id: string;
  requisicionId: string;
  requisicionFolio: string;
  areaId: string;
  areaNombre: string | null;
  ciudadOperacionId: string | null;
  ciudadOperacionNombre: string | null;
  productoId: string;
  productoNombre: string | null;
  rubroId: string;
  rubroNombre: string | null;
  unidadMedidaId: string;
  unidadMedidaNombre: string | null;
  unidadMedidaAbreviatura: string | null;
  cantidad: number;
  cantidadComprada: number;
  cantidadAnulada: number;
  cantidadPendiente: number;
  observacion: string | null;
}

interface ItemPendienteQueryRow {
  id: string;
  requisicion_id: string;
  producto_id: string;
  rubro_id: string;
  unidad_medida_id: string;
  cantidad: number;
  cantidad_comprada: number;
  cantidad_anulada: number;
  cantidad_pendiente: number;
  observacion: string | null;
  producto?: { nombre: string } | null;
  rubro?: { nombre: string } | null;
  unidad_medida?: { nombre: string; abreviatura: string | null } | null;
  requisicion?: {
    folio: string;
    area_id: string;
    ciudad_operacion_id: string | null;
    area?: { nombre: string } | null;
    ciudad_operacion?: { nombre: string } | null;
  } | null;
}

const SELECT_CON_RELACIONES =
  "*, area:areas(nombre), ciudad_operacion:ciudades_operacion(nombre), " +
  "solicitante:usuarios!requisiciones_solicitante_id_fkey(nombre, supervisor_id), aprobador:usuarios!requisiciones_aprobador_id_fkey(nombre), " +
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
        cantidad_comprada: Number(it.cantidad_comprada),
        cantidad_anulada: Number(it.cantidad_anulada),
        cantidad_pendiente: Number(it.cantidad_pendiente),
        motivo_anulacion: it.motivo_anulacion,
      })) ?? [];

    return Requisicion.desdeFila({
      ...row,
      area_nombre: row.area?.nombre ?? null,
      ciudad_operacion_nombre: row.ciudad_operacion?.nombre ?? null,
      solicitante_nombre: row.solicitante?.nombre ?? null,
      solicitante_supervisor_id: row.solicitante?.supervisor_id ?? null,
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

  /**
   * Reemplaza descripción + el set completo de ítems de una requisición vía
   * la RPC `editar_requisicion` (dueño o Superadministrador, solo mientras
   * 'pendiente' -- la RPC vuelve a validar esto aunque la UI ya lo filtre).
   */
  async editarConItems(
    id: string,
    input: {
      descripcion: string | null;
      items: { productoId: string; cantidad: number; observacion: string | null }[];
    },
  ): Promise<Requisicion> {
    const { error } = await this.client.rpc("editar_requisicion", {
      p_id: id,
      p_items: input.items.map((i) => ({
        producto_id: i.productoId,
        cantidad: i.cantidad,
        observacion: i.observacion,
      })),
      p_descripcion: input.descripcion,
    });
    if (error) throw new Error(`[requisiciones] editar_requisicion: ${error.message}`);

    const editada = await this.findById(id);
    if (!editada) throw new Error("Requisición no encontrada tras editarla.");
    return editada;
  }

  /**
   * Anula (escribe como no comprado, con motivo obligatorio) TODO el saldo
   * pendiente restante de un ítem vía la RPC `anular_saldo_requisicion_item`.
   * Puede cerrar la requisición si era su último ítem con saldo pendiente.
   */
  async anularSaldoItem(requisicionItemId: string, motivo: string): Promise<void> {
    const { error } = await this.client.rpc("anular_saldo_requisicion_item", {
      p_requisicion_item_id: requisicionItemId,
      p_motivo: motivo,
    });
    if (error) throw new Error(`[requisicion_items] anular_saldo_requisicion_item: ${error.message}`);
  }

  /**
   * Ítems con saldo pendiente > 0 de requisiciones 'aprobada'/'en_compra',
   * aplanados con los datos de su requisición de origen -- es la fuente de
   * datos del módulo de Compras para armar una OC que puede cruzar varias
   * requisiciones (misma área/ciudad). Consulta directa a `requisicion_items`
   * (no vía `Requisicion.desdeFila`): el shape que necesita Compras es "un
   * ítem con su origen", no "una requisición con sus ítems".
   */
  async listarItemsPendientesParaCompra(): Promise<ItemPendienteCompra[]> {
    const { data, error } = await this.client
      .from("requisicion_items")
      .select(
        "id, requisicion_id, producto_id, rubro_id, unidad_medida_id, cantidad, cantidad_comprada, cantidad_anulada, cantidad_pendiente, observacion, " +
          "producto:productos(nombre), rubro:rubros(nombre), unidad_medida:unidades_medida(nombre, abreviatura), " +
          "requisicion:requisiciones!inner(folio, area_id, ciudad_operacion_id, estado, area:areas(nombre), ciudad_operacion:ciudades_operacion(nombre))",
      )
      .gt("cantidad_pendiente", 0)
      .in("requisicion.estado", ["aprobada", "en_compra"]);
    if (error) throw new Error(`[requisicion_items] listarItemsPendientesParaCompra: ${error.message}`);

    return (data as unknown as ItemPendienteQueryRow[])
      .filter((r) => r.requisicion !== null && r.requisicion !== undefined)
      .map((r) => ({
        id: r.id,
        requisicionId: r.requisicion_id,
        requisicionFolio: r.requisicion!.folio,
        areaId: r.requisicion!.area_id,
        areaNombre: r.requisicion!.area?.nombre ?? null,
        ciudadOperacionId: r.requisicion!.ciudad_operacion_id,
        ciudadOperacionNombre: r.requisicion!.ciudad_operacion?.nombre ?? null,
        productoId: r.producto_id,
        productoNombre: r.producto?.nombre ?? null,
        rubroId: r.rubro_id,
        rubroNombre: r.rubro?.nombre ?? null,
        unidadMedidaId: r.unidad_medida_id,
        unidadMedidaNombre: r.unidad_medida?.nombre ?? null,
        unidadMedidaAbreviatura: r.unidad_medida?.abreviatura ?? null,
        cantidad: Number(r.cantidad),
        cantidadComprada: Number(r.cantidad_comprada),
        cantidadAnulada: Number(r.cantidad_anulada),
        cantidadPendiente: Number(r.cantidad_pendiente),
        observacion: r.observacion,
      }));
  }
}
