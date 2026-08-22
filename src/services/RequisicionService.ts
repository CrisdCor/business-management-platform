import type { SupabaseClient } from "@supabase/supabase-js";
import { RequisicionRepository, type RequisicionFiltros } from "@/repositories/RequisicionRepository";
import { Requisicion } from "@/domain/entities/Requisicion";

export class RequisicionService {
  private readonly requisiciones: RequisicionRepository;

  constructor(client: SupabaseClient) {
    this.requisiciones = new RequisicionRepository(client);
  }

  listar(filtros: RequisicionFiltros = {}) {
    return this.requisiciones.listar(filtros);
  }

  obtener(id: string) {
    return this.requisiciones.findById(id);
  }

  /**
   * Crea una requisición por ítems (producto + cantidad + observación). El
   * área, la ciudad de operación, el solicitante y el estado inicial
   * (pendiente vs. aprobada según el rol de quien la crea) los fija la
   * función RPC `crear_requisicion` en base de datos, no el cliente.
   */
  async crear(input: {
    descripcion?: string | null;
    items: { productoId: string; cantidad: number; observacion: string | null }[];
  }): Promise<Requisicion> {
    if (input.items.length === 0) {
      throw new Error("La requisición debe tener al menos un ítem.");
    }
    return this.requisiciones.crearConItems({
      descripcion: input.descripcion ?? null,
      items: input.items,
    });
  }

  /** Aprueba la requisición. La RPC exige que quien aprueba sea Supervisor o Superadministrador. */
  async aprobar(id: string): Promise<Requisicion> {
    return this.requisiciones.aprobar(id);
  }

  /** Rechaza la requisición con motivo. La RPC exige que quien rechaza sea Superadministrador. */
  async rechazar(id: string, motivo: string): Promise<Requisicion> {
    return this.requisiciones.rechazar(id, motivo);
  }
}
