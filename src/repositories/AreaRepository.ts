import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Area, type AreaRow } from "@/domain/entities/Area";

export class AreaRepository extends BaseRepository<Area, AreaRow> {
  constructor(client: SupabaseClient) {
    super(client, "areas");
  }

  protected mapRow(row: AreaRow): Area {
    return Area.desdeFila(row);
  }
}
