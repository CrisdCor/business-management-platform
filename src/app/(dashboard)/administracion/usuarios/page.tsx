import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { UsuarioService } from "@/services/UsuarioService";
import { CatalogoService } from "@/services/CatalogoService";
import { MODULOS, MODULO_LABELS } from "@/domain/enums";
import { UsuariosView } from "@/app/(dashboard)/administracion/usuarios/UsuariosView";
import type { UsuarioVM, OpcionCatalogo, ModuloOpcion, PermisosUsuariosVM } from "@/app/(dashboard)/administracion/usuarios/types";

export const metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const supabase = await createClient();
  const usuario = await new AuthService(supabase).usuarioActual();
  if (!usuario) redirect("/login");

  if (!usuario.permisos.puedeLeer(MODULOS.ADMIN_USUARIOS)) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tienes acceso a este módulo.</div>;
  }

  const [usuarios, areas] = await Promise.all([
    new UsuarioService(supabase).listar(),
    new CatalogoService(supabase).listarAreas(),
  ]);

  const vm: UsuarioVM[] = usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    areaId: u.areaId,
    areaNombre: u.areaNombre,
    roles: u.permisos.getRoles(),
    activo: u.activo,
    fotoUrl: u.fotoUrl,
    permisos: u.permisos.toRows(),
  }));

  const areasVM: OpcionCatalogo[] = areas.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre }));
  const modulos: ModuloOpcion[] = Object.values(MODULOS).map((code) => ({ code, label: MODULO_LABELS[code] }));

  const permisos: PermisosUsuariosVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.ADMIN_USUARIOS),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.ADMIN_USUARIOS),
  };

  return <UsuariosView usuariosIniciales={vm} areas={areasVM} modulos={modulos} permisos={permisos} usuarioActualId={usuario.id} />;
}
