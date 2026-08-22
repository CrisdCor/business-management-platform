"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NotificacionService } from "@/services/NotificacionService";
import type { AccionResultado } from "@/app/actions/auth";

export async function marcarNotificacionLeidaAction(id: string): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new NotificacionService(supabase).marcarLeida(id);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la notificación." };
  }
}

export async function marcarTodasNotificacionesLeidasAction(): Promise<AccionResultado> {
  const supabase = await createClient();
  try {
    await new NotificacionService(supabase).marcarTodasLeidas();
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudieron actualizar las notificaciones." };
  }
}
