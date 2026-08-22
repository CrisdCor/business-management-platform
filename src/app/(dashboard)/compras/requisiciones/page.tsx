import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { RequisicionService } from "@/services/RequisicionService";
import { CompraService } from "@/services/CompraService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { RequisicionesView } from "@/app/(dashboard)/compras/requisiciones/RequisicionesView";
import type { RequisicionVM, OpcionCatalogo, PermisosRequisicionesVM } from "@/app/(dashboard)/compras/requisiciones/types";

export const metadata = { title: "Requisiciones" };

export default async function RequisicionesPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.COMPRAS_REQUISICIONES)) {
    return <SinAcceso />;
  }

  const requisicionSvc = new RequisicionService(supabase);
  const catalogoSvc = new CatalogoService(supabase);
  const compraSvc = new CompraService(supabase);

  const [requisiciones, areas, rubros, compras] = await Promise.all([
    requisicionSvc.listar(),
    catalogoSvc.listarAreas(),
    catalogoSvc.listarRubros(),
    usuario.permisos.puedeLeer(MODULOS.COMPRAS_COMPRAS) ? compraSvc.listar() : Promise.resolve([]),
  ]);

  const requisicionesConCompra = new Set(compras.map((c) => c.requisicionId));

  const vm: RequisicionVM[] = requisiciones.map((r) => ({
    id: r.id,
    folio: r.folio,
    areaId: r.areaId,
    areaNombre: r.areaNombre ?? "—",
    rubroId: r.rubroId,
    rubroNombre: r.rubroNombre ?? "—",
    descripcion: r.descripcion,
    montoEstimado: r.montoEstimado,
    estado: r.estado,
    solicitanteNombre: r.solicitanteNombre ?? "—",
    aprobadorNombre: r.aprobadorNombre,
    diasRestantesParaComprar: r.diasRestantesParaComprar,
    plazoVencido: r.plazoVencido,
    tieneCompraRegistrada: requisicionesConCompra.has(r.id),
    createdAt: r.createdAt.toISOString(),
  }));

  const areasVM: OpcionCatalogo[] = areas.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre }));
  const rubrosVM: OpcionCatalogo[] = rubros.filter((r) => r.activo).map((r) => ({ id: r.id, nombre: r.nombre }));

  const permisos: PermisosRequisicionesVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.COMPRAS_REQUISICIONES),
    puedeAprobar: usuario.permisos.puedeActualizar(MODULOS.COMPRAS_REQUISICIONES),
  };

  return (
    <RequisicionesView
      requisicionesIniciales={vm}
      areas={areasVM}
      rubros={rubrosVM}
      permisos={permisos}
    />
  );
}

function SinAcceso() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      No tienes acceso a este módulo.
    </div>
  );
}
