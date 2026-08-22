import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { NotificacionService } from "@/services/NotificacionService";
import { AppShell } from "@/components/layout/AppShell";
import type { UsuarioSesion } from "@/components/layout/UserMenu";
import type { NotificacionVM } from "@/components/layout/NotificacionesBell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const auth = new AuthService(supabase);
  const usuario = await auth.usuarioActual();

  if (!usuario) redirect("/login");

  const notificaciones = await new NotificacionService(supabase).listarPropias();
  const notificacionesVM: NotificacionVM[] = notificaciones.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    mensaje: n.mensaje,
    leida: n.leida,
    createdAt: n.createdAt.toISOString(),
  }));

  const sesion: UsuarioSesion = {
    nombre: usuario.nombre,
    correo: usuario.correo,
    fotoUrl: usuario.fotoUrl,
    etiquetaRoles: usuario.etiquetaRoles,
  };

  return (
    <AppShell usuario={sesion} modulosVisibles={usuario.permisos.modulosVisibles()} notificaciones={notificacionesVM}>
      {children}
    </AppShell>
  );
}
