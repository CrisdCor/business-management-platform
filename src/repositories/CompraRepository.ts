import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Compra, type CompraRow, type CompraItemRow } from "@/domain/entities/Compra";
import type { EstadoCompra } from "@/domain/enums";

interface CompraItemQueryRow {
  id: string;
  compra_id: string;
  requisicion_item_id: string;
  precio_unitario: number;
  requisicion_item?: {
    cantidad: number;
    observacion: string | null;
    producto?: { nombre: string } | null;
    unidad_medida?: { nombre: string; abreviatura: string | null } | null;
  } | null;
}

interface CompraQueryRow extends CompraRow {
  proveedor?: { nombre: string } | null;
  compra_items?: CompraItemQueryRow[];
}

export interface CompraFiltros {
  estado?: EstadoCompra;
}

const SELECT_CON_RELACIONES =
  "*, proveedor:proveedores(nombre), " +
  "compra_items(*, requisicion_item:requisicion_items(cantidad, observacion, producto:productos(nombre), unidad_medida:unidades_medida(nombre, abreviatura)))";

export class CompraRepository extends BaseRepository<Compra, CompraQueryRow> {
  constructor(client: SupabaseClient) {
    super(client, "compras");
  }

  protected override get select(): string {
    return SELECT_CON_RELACIONES;
  }

  protected mapRow(row: CompraQueryRow): Compra {
    const items: CompraItemRow[] =
      row.compra_items?.map((it) => ({
        id: it.id,
        compra_id: it.compra_id,
        requisicion_item_id: it.requisicion_item_id,
        precio_unitario: Number(it.precio_unitario),
        cantidad: it.requisicion_item?.cantidad != null ? Number(it.requisicion_item.cantidad) : null,
        observacion: it.requisicion_item?.observacion ?? null,
        producto_nombre: it.requisicion_item?.producto?.nombre ?? null,
        unidad_medida_nombre: it.requisicion_item?.unidad_medida?.nombre ?? null,
        unidad_medida_abreviatura: it.requisicion_item?.unidad_medida?.abreviatura ?? null,
      })) ?? [];

    return Compra.desdeFila({ ...row, proveedor_nombre: row.proveedor?.nombre ?? null, items });
  }

  async listar(filtros: CompraFiltros = {}): Promise<Compra[]> {
    let query = this.client.from(this.table).select(this.select);
    if (filtros.estado) query = query.eq("estado", filtros.estado);
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`[compras] listar: ${error.message}`);
    return (data as unknown as CompraQueryRow[]).map((r) => this.mapRow(r));
  }

  /** Una requisición ahora puede tener varias compras (compra parcial por ítems). */
  async listarPorRequisicion(requisicionId: string): Promise<Compra[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select(this.select)
      .eq("requisicion_id", requisicionId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`[compras] listarPorRequisicion: ${error.message}`);
    return (data as unknown as CompraQueryRow[]).map((r) => this.mapRow(r));
  }

  /**
   * Registra la compra (OC) a partir de ítems de una requisición aprobada,
   * en una sola transacción atómica vía la RPC `registrar_compra_oc`, que
   * valida pertenencia/disponibilidad de cada ítem y el presupuesto por rubro.
   */
  async registrarConItems(input: {
    requisicionId: string;
    proveedorId: string;
    items: { requisicionItemId: string; precioUnitario: number }[];
    fechaEntregaEstimada: string | null;
    notas: string | null;
  }): Promise<Compra> {
    const { data: id, error } = await this.client.rpc("registrar_compra_oc", {
      p_requisicion_id: input.requisicionId,
      p_proveedor_id: input.proveedorId,
      p_items: input.items.map((i) => ({
        requisicion_item_id: i.requisicionItemId,
        precio_unitario: i.precioUnitario,
      })),
      p_fecha_entrega_estimada: input.fechaEntregaEstimada,
      p_notas: input.notas,
    });
    if (error) throw new Error(`[compras] registrar_compra_oc: ${error.message}`);

    const creada = await this.findById(id as string);
    if (!creada) throw new Error("La compra se registró pero no se pudo leer de vuelta.");
    return creada;
  }

  /** Aprueba el exceso de presupuesto de una compra vía la RPC `aprobar_exceso_compra_oc` (exige Superadministrador). */
  async aprobarExceso(id: string): Promise<Compra> {
    const { error } = await this.client.rpc("aprobar_exceso_compra_oc", { p_compra_id: id });
    if (error) throw new Error(`[compras] aprobar_exceso_compra_oc: ${error.message}`);

    const actualizada = await this.findById(id);
    if (!actualizada) throw new Error("Compra no encontrada tras aprobar el exceso.");
    return actualizada;
  }
}
