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

  const vm: CompraVM[] = compras.map((c) => {
    const requisicion = requisicionPorId.get(c.requisicionId);
    return {
      id: c.id,
      folioOc: c.folioOc,
      requisicionId: c.requisicionId,
      requisicionFolio: requisicion?.folio ?? "—",
      requisicionDescripcion: requisicion?.descripcion ?? "—",
      proveedorNombre: c.proveedorNombre ?? "—",
      montoTotal: c.montoTotal,
      excedePresupuesto: c.excedePresupuesto,
      estado: c.estado,
      fechaCompra: c.fechaCompra.toISOString(),
      fechaEntregaEstimada: c.fechaEntregaEstimada?.toISOString() ?? null,
      fechaCierre: c.fechaCierre?.toISOString() ?? null,
      diasParaEntrega: c.diasParaEntrega,
      items: c.items.map((it) => ({
        id: it.id,
        requisicionItemId: it.requisicion_item_id,
        productoNombre: it.producto_nombre ?? "—",
        unidadMedidaNombre: it.unidad_medida_nombre ?? "—",
        unidadMedidaAbreviatura: it.unidad_medida_abreviatura ?? null,
        cantidad: it.cantidad ?? 0,
        precioUnitario: it.precio_unitario,
        observacion: it.observacion ?? null,
      })),
    };
  });

  const requisicionesVM: RequisicionDisponibleVM[] = todasRequisiciones
    .filter(
      (r) =>
        (r.estado === ESTADO_REQUISICION.APROBADA || r.estado === ESTADO_REQUISICION.EN_COMPRA) &&
        r.items.some((it) => !it.comprado),
    )
    .map((r) => ({
      id: r.id,
      folio: r.folio,
      descripcion: r.descripcion,
      areaNombre: r.areaNombre ?? "—",
      ciudadOperacionNombre: r.ciudadOperacionNombre ?? "—",
      itemsPendientes: r.items
        .filter((it) => !it.comprado)
        .map((it) => ({
          id: it.id,
          productoNombre: it.producto_nombre ?? "—",
          rubroNombre: it.rubro_nombre ?? "—",
          unidadMedidaNombre: it.unidad_medida_nombre ?? "—",
          unidadMedidaAbreviatura: it.unidad_medida_abreviatura ?? null,
          cantidad: it.cantidad,
          observacion: it.observacion,
        })),
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
