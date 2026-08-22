import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "@/repositories/base/BaseRepository";
import { Notificacion, type NotificacionRow } from "@/domain/entities/Notificacion";

export class NotificacionRepository extends BaseRepository<Notificacion, NotificacionRow> {
  constructor(client: SupabaseClient) {
    super(client, "notificaciones");
  }

  protected mapRow(row: NotificacionRow): Notificacion {
    return Notificacion.desdeFila(row);
  }

  /** Últimas notificaciones del usuario autenticado (RLS ya filtra por `usuario_id`). */
  async listarPropias(limite = 15): Promise<Notificacion[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select(this.select)
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error) throw new Error(`[notificaciones] listarPropias: ${error.message}`);
    return (data as unknown as NotificacionRow[]).map((r) => this.mapRow(r));
  }

  async contarNoLeidas(): Promise<number> {
    const { count, error } = await this.client
      .from(this.table)
      .select("id", { count: "exact", head: true })
      .eq("leida", false);
    if (error) throw new Error(`[notificaciones] contarNoLeidas: ${error.message}`);
    return count ?? 0;
  }

  async marcarLeida(id: string): Promise<void> {
    const { error } = await this.client.from(this.table).update({ leida: true }).eq("id", id);
    if (error) throw new Error(`[notificaciones] marcarLeida: ${error.message}`);
  }

  async marcarTodasLeidas(): Promise<void> {
    const { error } = await this.client.from(this.table).update({ leida: true }).eq("leida", false);
    if (error) throw new Error(`[notificaciones] marcarTodasLeidas: ${error.message}`);
  }
}
