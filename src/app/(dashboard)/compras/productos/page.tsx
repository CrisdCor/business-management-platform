import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { ProductosView, type ProductoVM, type PermisosProductosVM } from "@/app/(dashboard)/compras/productos/ProductosView";
import type { OpcionCatalogo } from "@/app/(dashboard)/compras/requisiciones/types";

export const metadata = { title: "Productos" };

export default async function ProductosPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.COMPRAS_PRODUCTOS)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const catalogoSvc = new CatalogoService(supabase);
  const [productos, rubros, unidadesMedida] = await Promise.all([
    catalogoSvc.listarProductos(),
    catalogoSvc.listarRubros(),
    catalogoSvc.listarUnidadesMedida(),
  ]);

  const vm: ProductoVM[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    rubroId: p.rubroId,
    rubroNombre: p.rubroNombre ?? "—",
    unidadMedidaId: p.unidadMedidaId,
    unidadMedidaNombre: p.unidadMedidaNombre ?? "—",
    activo: p.activo,
  }));

  const rubrosVM: OpcionCatalogo[] = rubros.filter((r) => r.activo).map((r) => ({ id: r.id, nombre: r.nombre }));
  const unidadesVM: OpcionCatalogo[] = unidadesMedida.filter((u) => u.activo).map((u) => ({ id: u.id, nombre: u.nombre }));

  const permisos: PermisosProductosVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.COMPRAS_PRODUCTOS),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.COMPRAS_PRODUCTOS),
  };

  return <ProductosView productosIniciales={vm} rubros={rubrosVM} unidadesMedida={unidadesVM} permisos={permisos} />;
}
