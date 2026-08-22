import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Rubro, type RubroRow } from "@/domain/entities/Rubro";

export class RubroRepository extends BaseRepository<Rubro, RubroRow> {
  constructor(client: SupabaseClient) {
    super(client, "rubros");
  }

  protected mapRow(row: RubroRow): Rubro {
    return Rubro.desdeFila(row);
  }
}
