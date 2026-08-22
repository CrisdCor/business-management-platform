import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { CiudadOperacion, type CiudadOperacionRow } from "@/domain/entities/CiudadOperacion";

export class CiudadOperacionRepository extends BaseRepository<CiudadOperacion, CiudadOperacionRow> {
  constructor(client: SupabaseClient) {
    super(client, "ciudades_operacion");
  }

  protected mapRow(row: CiudadOperacionRow): CiudadOperacion {
    return CiudadOperacion.desdeFila(row);
  }
}
