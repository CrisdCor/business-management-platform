import type { SupabaseClient } from "@supabase/supabase-js";
import { NotificacionRepository } from "@/repositories/NotificacionRepository";

/** Orquesta las notificaciones dentro de la app del usuario autenticado. */
export class NotificacionService {
  private readonly notificaciones: NotificacionRepository;

  constructor(client: SupabaseClient) {
    this.notificaciones = new NotificacionRepository(client);
  }

  listarPropias(limite = 15) {
    return this.notificaciones.listarPropias(limite);
  }

  contarNoLeidas() {
    return this.notificaciones.contarNoLeidas();
  }

  marcarLeida(id: string) {
    return this.notificaciones.marcarLeida(id);
  }

  marcarTodasLeidas() {
    return this.notificaciones.marcarTodasLeidas();
  }
}
