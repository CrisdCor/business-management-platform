import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { AreasView, type AreaVM, type PermisosAreasVM } from "@/app/(dashboard)/administracion/areas/AreasView";

export const metadata = { title: "Áreas" };

export default async function AreasPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.ADMIN_AREAS)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const areas = await new CatalogoService(supabase).listarAreas();
  const vm: AreaVM[] = areas.map((a) => ({ id: a.id, nombre: a.nombre, activo: a.activo }));

  const permisos: PermisosAreasVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.ADMIN_AREAS),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.ADMIN_AREAS),
  };

  return <AreasView areasIniciales={vm} permisos={permisos} />;
}
