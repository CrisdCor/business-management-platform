import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CompraService } from "@/services/CompraService";
import { RequisicionService } from "@/services/RequisicionService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { OrdenesView } from "@/app/(dashboard)/compras/ordenes/OrdenesView";
import type {
  CompraVM,
  ItemPendienteCompraVM,
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

  const [compras, itemsPendientes, proveedores] = await Promise.all([
    compraSvc.listar(),
    puedeRegistrar ? requisicionSvc.listarItemsPendientes() : Promise.resolve([]),
    puedeRegistrar ? catalogoSvc.listarProveedores() : Promise.resolve([]),
  ]);

  const vm: CompraVM[] = compras.map((c) => ({
    id: c.id,
    folioOc: c.folioOc,
    requisicionesFolios: c.foliosRequisiciones,
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
      requisicionId: it.requisicion_id ?? "",
      requisicionFolio: it.requisicion_folio ?? "—",
      productoNombre: it.producto_nombre ?? "—",
      unidadMedidaNombre: it.unidad_medida_nombre ?? "—",
      unidadMedidaAbreviatura: it.unidad_medida_abreviatura ?? null,
      cantidad: it.cantidad,
      precioUnitario: it.precio_unitario,
      observacion: it.observacion ?? null,
    })),
  }));

  const itemsPendientesVM: ItemPendienteCompraVM[] = itemsPendientes.map((it) => ({
    id: it.id,
    requisicionId: it.requisicionId,
    requisicionFolio: it.requisicionFolio,
    areaId: it.areaId,
    areaNombre: it.areaNombre ?? "—",
    ciudadOperacionId: it.ciudadOperacionId,
    ciudadOperacionNombre: it.ciudadOperacionNombre ?? "—",
    productoNombre: it.productoNombre ?? "—",
    rubroNombre: it.rubroNombre ?? "—",
    unidadMedidaNombre: it.unidadMedidaNombre ?? "—",
    unidadMedidaAbreviatura: it.unidadMedidaAbreviatura,
    cantidadPendiente: it.cantidadPendiente,
    observacion: it.observacion,
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
      itemsPendientes={itemsPendientesVM}
      proveedores={proveedoresVM}
      permisos={permisos}
    />
  );
}
