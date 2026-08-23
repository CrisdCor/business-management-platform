import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { RequisicionService } from "@/services/RequisicionService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { RequisicionesView } from "@/app/(dashboard)/compras/requisiciones/RequisicionesView";
import type {
  RequisicionVM,
  ProductoOpcionVM,
  PermisosRequisicionesVM,
  SolicitanteVM,
} from "@/app/(dashboard)/compras/requisiciones/types";

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

  const [requisiciones, productos] = await Promise.all([
    requisicionSvc.listar(),
    catalogoSvc.listarProductos(),
  ]);

  const esSuperadmin = usuario.permisos.esSuperadministrador();
  const esSupervisor = usuario.permisos.esSupervisor();

  const vm: RequisicionVM[] = requisiciones.map((r) => ({
    id: r.id,
    folio: r.folio,
    areaNombre: r.areaNombre ?? "—",
    ciudadOperacionNombre: r.ciudadOperacionNombre ?? "—",
    descripcion: r.descripcion,
    estado: r.estado,
    solicitanteId: r.solicitanteId,
    solicitanteNombre: r.solicitanteNombre ?? "—",
    aprobadorNombre: r.aprobadorNombre,
    motivoRechazo: r.motivoRechazo,
    fechaAprobacion: r.fechaAprobacion?.toISOString() ?? null,
    diasRestantesParaComprar: r.diasRestantesParaComprar,
    plazoVencido: r.plazoVencido,
    estadoSemaforo: r.estadoSemaforo,
    puedeEditar: r.puedeEditar(usuario.id, esSuperadmin),
    puedeAprobar: r.puedeAprobar(usuario.id, esSuperadmin, esSupervisor),
    items: r.items.map((it) => ({
      id: it.id,
      productoId: it.producto_id,
      productoNombre: it.producto_nombre ?? "—",
      rubroNombre: it.rubro_nombre ?? "—",
      unidadMedidaNombre: it.unidad_medida_nombre ?? "—",
      unidadMedidaAbreviatura: it.unidad_medida_abreviatura ?? null,
      cantidad: it.cantidad,
      observacion: it.observacion,
      cantidadComprada: it.cantidad_comprada,
      cantidadAnulada: it.cantidad_anulada,
      cantidadPendiente: it.cantidad_pendiente,
      motivoAnulacion: it.motivo_anulacion,
    })),
    createdAt: r.createdAt.toISOString(),
  }));

  const productosVM: ProductoOpcionVM[] = productos
    .filter((p) => p.activo)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      rubroNombre: p.rubroNombre ?? "—",
      unidadMedidaNombre: p.unidadMedidaNombre ?? "—",
      unidadMedidaAbreviatura: p.unidadMedidaAbreviatura,
    }));

  const solicitante: SolicitanteVM = {
    areaNombre: usuario.areaNombre ?? "Sin asignar",
    ciudadOperacionNombre: usuario.ciudadOperacionNombre ?? "Sin asignar",
  };

  const permisos: PermisosRequisicionesVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.COMPRAS_REQUISICIONES),
    puedeRechazar: esSuperadmin,
  };

  return (
    <RequisicionesView
      requisicionesIniciales={vm}
      productos={productosVM}
      solicitante={solicitante}
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
