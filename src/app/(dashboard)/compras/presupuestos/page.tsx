import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { PresupuestoService } from "@/services/PresupuestoService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { PresupuestosView } from "@/app/(dashboard)/compras/presupuestos/PresupuestosView";
import type { PresupuestoVM, OpcionCatalogo, PermisosPresupuestosVM } from "@/app/(dashboard)/compras/presupuestos/types";

export const metadata = { title: "Presupuestos" };

export default async function PresupuestosPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.COMPRAS_PRESUPUESTOS)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const ahora = new Date();
  const [presupuestos, areas, rubros] = await Promise.all([
    new PresupuestoService(supabase).listarPorPeriodo(ahora.getFullYear(), ahora.getMonth() + 1),
    new CatalogoService(supabase).listarAreas(),
    new CatalogoService(supabase).listarRubros(),
  ]);

  const vm: PresupuestoVM[] = presupuestos.map((p) => ({
    id: p.id,
    rubroId: p.rubroId,
    rubroNombre: p.rubroNombre ?? "—",
    areaId: p.areaId,
    areaNombre: p.areaNombre ?? "—",
    anio: p.anio,
    mes: p.mes,
    montoAsignado: p.montoAsignado,
    montoConsumido: p.montoConsumido,
    disponible: p.disponible,
    porcentajeConsumido: p.porcentajeConsumido,
    nivelAlerta: p.nivelAlerta,
  }));

  const permisos: PermisosPresupuestosVM = {
    puedeAsignar: usuario.permisos.puedeCrear(MODULOS.COMPRAS_PRESUPUESTOS),
    puedeAjustar: usuario.permisos.puedeActualizar(MODULOS.COMPRAS_PRESUPUESTOS),
  };

  return (
    <PresupuestosView
      presupuestosIniciales={vm}
      areas={areas.filter((a) => a.activo).map<OpcionCatalogo>((a) => ({ id: a.id, nombre: a.nombre }))}
      rubros={rubros.filter((r) => r.activo).map<OpcionCatalogo>((r) => ({ id: r.id, nombre: r.nombre }))}
      permisos={permisos}
      anio={ahora.getFullYear()}
      mes={ahora.getMonth() + 1}
    />
  );
}
