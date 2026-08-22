import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { RubrosView, type RubroVM, type PermisosRubrosVM } from "@/app/(dashboard)/compras/rubros/RubrosView";

export const metadata = { title: "Rubros" };

export default async function RubrosPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.COMPRAS_RUBROS)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const rubros = await new CatalogoService(supabase).listarRubros();

  const vm: RubroVM[] = rubros.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    activo: r.activo,
  }));

  const permisos: PermisosRubrosVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.COMPRAS_RUBROS),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.COMPRAS_RUBROS),
  };

  return <RubrosView rubrosIniciales={vm} permisos={permisos} />;
}
