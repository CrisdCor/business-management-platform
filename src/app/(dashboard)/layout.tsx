import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { AppShell } from "@/components/layout/AppShell";
import type { UsuarioSesion } from "@/components/layout/UserMenu";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const auth = new AuthService(supabase);
  const usuario = await auth.usuarioActual();

  if (!usuario) redirect("/login");

  const sesion: UsuarioSesion = {
    nombre: usuario.nombre,
    correo: usuario.correo,
    fotoUrl: usuario.fotoUrl,
    etiquetaRoles: usuario.etiquetaRoles,
  };

  return (
    <AppShell usuario={sesion} modulosVisibles={usuario.permisos.modulosVisibles()}>
      {children}
    </AppShell>
  );
}
