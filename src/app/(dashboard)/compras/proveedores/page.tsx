import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS } from "@/domain/enums";
import { ProveedoresView } from "@/app/(dashboard)/compras/proveedores/ProveedoresView";
import type { ProveedorVM, PermisosProveedoresVM } from "@/app/(dashboard)/compras/proveedores/types";

export const metadata = { title: "Proveedores" };

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.COMPRAS_PROVEEDORES)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const proveedores = await new CatalogoService(supabase).listarProveedores();

  const vm: ProveedorVM[] = proveedores.map((p) => ({
    id: p.id,
    nitCedula: p.nitCedula,
    nombre: p.nombre,
    banco: p.banco,
    tipoCuenta: p.tipoCuenta,
    numeroCuenta: p.numeroCuenta,
    activo: p.activo,
  }));

  const permisos: PermisosProveedoresVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.COMPRAS_PROVEEDORES),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.COMPRAS_PROVEEDORES),
  };

  return <ProveedoresView proveedoresIniciales={vm} permisos={permisos} />;
}
