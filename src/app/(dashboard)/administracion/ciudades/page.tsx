import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import {
  CiudadesOperacionView,
  type CiudadOperacionVM,
  type PermisosCiudadesVM,
} from "@/app/(dashboard)/administracion/ciudades/CiudadesOperacionView";

export const metadata = { title: "Ciudades de operación" };

export default async function CiudadesOperacionPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.ADMIN_CIUDADES)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const ciudades = await new CatalogoService(supabase).listarCiudadesOperacion();
  const vm: CiudadOperacionVM[] = ciudades.map((c) => ({ id: c.id, nombre: c.nombre, activo: c.activo }));

  const permisos: PermisosCiudadesVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.ADMIN_CIUDADES),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.ADMIN_CIUDADES),
  };

  return <CiudadesOperacionView ciudadesIniciales={vm} permisos={permisos} />;
}
