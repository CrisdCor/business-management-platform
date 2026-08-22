import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import {
  UnidadesMedidaView,
  type UnidadMedidaVM,
  type PermisosUnidadesMedidaVM,
} from "@/app/(dashboard)/compras/unidades-medida/UnidadesMedidaView";

export const metadata = { title: "Unidades de medida" };

export default async function UnidadesMedidaPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.COMPRAS_UNIDADES_MEDIDA)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const unidades = await new CatalogoService(supabase).listarUnidadesMedida();

  const vm: UnidadMedidaVM[] = unidades.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    abreviatura: u.abreviatura,
    activo: u.activo,
  }));

  const permisos: PermisosUnidadesMedidaVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.COMPRAS_UNIDADES_MEDIDA),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.COMPRAS_UNIDADES_MEDIDA),
  };

  return <UnidadesMedidaView unidadesIniciales={vm} permisos={permisos} />;
}
