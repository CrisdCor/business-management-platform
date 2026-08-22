import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { UnidadMedida, type UnidadMedidaRow } from "@/domain/entities/UnidadMedida";

export class UnidadMedidaRepository extends BaseRepository<UnidadMedida, UnidadMedidaRow> {
  constructor(client: SupabaseClient) {
    super(client, "unidades_medida");
  }

  protected mapRow(row: UnidadMedidaRow): UnidadMedida {
    return UnidadMedida.desdeFila(row);
  }
}
