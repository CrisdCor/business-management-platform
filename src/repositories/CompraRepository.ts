import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Compra, type CompraRow, type CompraItemRow } from "@/domain/entities/Compra";
import type { EstadoCompra } from "@/domain/enums";

interface CompraItemQueryRow {
  id: string;
  compra_id: string;
  requisicion_item_id: string;
  precio_unitario: number;
  cantidad: number;
  requisicion_item?: {
    observacion: string | null;
    producto?: { nombre: string } | null;
    unidad_medida?: { nombre: string; abreviatura: string | null } | null;
    requisicion?: { id: string; folio: string } | null;
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
  "compra_items(*, requisicion_item:requisicion_items(observacion, producto:productos(nombre), unidad_medida:unidades_medida(nombre, abreviatura), requisicion:requisiciones(id, folio)))";

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
        cantidad: Number(it.cantidad),
        observacion: it.requisicion_item?.observacion ?? null,
        producto_nombre: it.requisicion_item?.producto?.nombre ?? null,
        unidad_medida_nombre: it.requisicion_item?.unidad_medida?.nombre ?? null,
        unidad_medida_abreviatura: it.requisicion_item?.unidad_medida?.abreviatura ?? null,
        requisicion_id: it.requisicion_item?.requisicion?.id ?? null,
        requisicion_folio: it.requisicion_item?.requisicion?.folio ?? null,
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

  /**
   * Una requisición puede aparecer en varias compras (compra parcial), y una
   * compra puede tocar varias requisiciones (misma área/ciudad) -- por eso ya
   * no existe `compras.requisicion_id` y esto se resuelve en dos pasos:
   * primero los `compra_items` cuyo ítem de origen pertenece a esta
   * requisición (PostgREST no filtra bien un `eq` a dos saltos de
   * profundidad desde `compras`), luego las `compras` distintas referidas.
   */
  async listarPorRequisicion(requisicionId: string): Promise<Compra[]> {
    const { data: itemsData, error: itemsError } = await this.client
      .from("compra_items")
      .select("compra_id, requisicion_item:requisicion_items!inner(requisicion_id)")
      .eq("requisicion_item.requisicion_id", requisicionId);
    if (itemsError) throw new Error(`[compras] listarPorRequisicion (compra_items): ${itemsError.message}`);

    const compraIds = Array.from(new Set((itemsData ?? []).map((r) => r.compra_id)));
    if (compraIds.length === 0) return [];

    const { data, error } = await this.client
      .from(this.table)
      .select(this.select)
      .in("id", compraIds)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`[compras] listarPorRequisicion: ${error.message}`);
    return (data as unknown as CompraQueryRow[]).map((r) => this.mapRow(r));
  }

  /**
   * Registra la compra (OC) a partir de ítems pendientes de una o varias
   * requisiciones aprobadas (siempre que compartan área y ciudad de
   * operación), en una sola transacción atómica vía la RPC
   * `registrar_compra_oc`, que valida saldo pendiente/disponibilidad de cada
   * ítem y el presupuesto por rubro. Cada ítem puede pedir menos de lo
   * pendiente (compra parcial).
   */
  async registrarConItems(input: {
    proveedorId: string;
    items: { requisicionItemId: string; cantidad: number; precioUnitario: number }[];
    fechaEntregaEstimada: string | null;
    notas: string | null;
  }): Promise<Compra> {
    const { data: id, error } = await this.client.rpc("registrar_compra_oc", {
      p_proveedor_id: input.proveedorId,
      p_items: input.items.map((i) => ({
        requisicion_item_id: i.requisicionItemId,
        cantidad: i.cantidad,
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
