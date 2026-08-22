import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CompraService } from "@/services/CompraService";
import { RequisicionService } from "@/services/RequisicionService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS, ESTADO_REQUISICION } from "@/domain/enums";
import { OrdenesView } from "@/app/(dashboard)/compras/ordenes/OrdenesView";
import type {
  CompraVM,
  RequisicionDisponibleVM,
  ProveedorOpcionVM,
  PermisosOrdenesVM,
} from "@/app/(dashboard)/compras/ordenes/types";

export const metadata = { title: "Compras / OC" };

export default async function OrdenesPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.COMPRAS_COMPRAS)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const compraSvc = new CompraService(supabase);
  const requisicionSvc = new RequisicionService(supabase);
  const catalogoSvc = new CatalogoService(supabase);

  const puedeRegistrar = usuario.permisos.puedeCrear(MODULOS.COMPRAS_COMPRAS);
  const puedeVerRequisiciones = usuario.permisos.puedeLeer(MODULOS.COMPRAS_REQUISICIONES);

  const [compras, todasRequisiciones, proveedores] = await Promise.all([
    compraSvc.listar(),
    puedeVerRequisiciones ? requisicionSvc.listar() : Promise.resolve([]),
    puedeRegistrar ? catalogoSvc.listarProveedores() : Promise.resolve([]),
  ]);

  const requisicionPorId = new Map(todasRequisiciones.map((r) => [r.id, r]));
  const idsConCompra = new Set(compras.map((c) => c.requisicionId));

  const vm: CompraVM[] = compras.map((c) => {
    const requisicion = requisicionPorId.get(c.requisicionId);
    return {
      id: c.id,
      folioOc: c.folioOc,
      requisicionId: c.requisicionId,
      requisicionFolio: requisicion?.folio ?? "—",
      requisicionDescripcion: requisicion?.descripcion ?? "—",
      proveedorNombre: c.proveedorNombre ?? "—",
      monto: c.monto,
      excedePresupuesto: c.excedePresupuesto,
      estado: c.estado,
      fechaCompra: c.fechaCompra.toISOString(),
      fechaEntregaEstimada: c.fechaEntregaEstimada?.toISOString() ?? null,
      fechaCierre: c.fechaCierre?.toISOString() ?? null,
      diasParaEntrega: c.diasParaEntrega,
    };
  });

  const requisicionesVM: RequisicionDisponibleVM[] = todasRequisiciones
    .filter((r) => r.estado === ESTADO_REQUISICION.APROBADA && !idsConCompra.has(r.id))
    .map((r) => ({
      id: r.id,
      folio: r.folio,
      descripcion: r.descripcion,
      montoEstimado: r.montoEstimado,
      areaNombre: r.areaNombre ?? "—",
      rubroNombre: r.rubroNombre ?? "—",
    }));

  const proveedoresVM: ProveedorOpcionVM[] = proveedores
    .filter((p) => p.activo)
    .map((p) => ({ id: p.id, nombre: p.nombre, nitCedula: p.nitCedula }));

  const permisos: PermisosOrdenesVM = {
    puedeRegistrar,
    puedeGestionar: usuario.permisos.puedeActualizar(MODULOS.COMPRAS_COMPRAS),
    esSuperadministrador: usuario.permisos.esSuperadministrador(),
  };

  return (
    <OrdenesView
      comprasIniciales={vm}
      requisicionesDisponibles={requisicionesVM}
      proveedores={proveedoresVM}
      permisos={permisos}
    />
  );
}
