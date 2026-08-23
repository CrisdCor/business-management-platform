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

  const usuarioService = new UsuarioService(supabase);
  const [usuarios, idsConMovimientos, areas, ciudadesOperacion] = await Promise.all([
    usuarioService.listar(),
    usuarioService.idsConMovimientos(),
    new CatalogoService(supabase).listarAreas(),
    new CatalogoService(supabase).listarCiudadesOperacion(),
  ]);

  const vm: UsuarioVM[] = usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    areaId: u.areaId,
    areaNombre: u.areaNombre,
    ciudadOperacionId: u.ciudadOperacionId,
    ciudadOperacionNombre: u.ciudadOperacionNombre,
    supervisorId: u.supervisorId,
    supervisorNombre: u.supervisorNombre,
    roles: u.permisos.getRoles(),
    activo: u.activo,
    fotoUrl: u.fotoUrl,
    permisos: u.permisos.toRows(),
    tieneMovimientos: idsConMovimientos.has(u.id),
  }));

  const areasVM: OpcionCatalogo[] = areas.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre }));
  const ciudadesVM: OpcionCatalogo[] = ciudadesOperacion.filter((c) => c.activo).map((c) => ({ id: c.id, nombre: c.nombre }));
  const modulos: ModuloOpcion[] = Object.values(MODULOS).map((code) => ({ code, label: MODULO_LABELS[code] }));

  const permisos: PermisosUsuariosVM = {
    puedeCrear: usuario.permisos.puedeCrear(MODULOS.ADMIN_USUARIOS),
    puedeActualizar: usuario.permisos.puedeActualizar(MODULOS.ADMIN_USUARIOS),
    // La anulación (borrado completo) es exclusiva del Superadministrador,
    // igual que rechazar una requisición: no depende de la matriz de permisos
    // por módulo, sino del rol exacto (la RPC lo vuelve a exigir server-side).
    puedeEliminar: usuario.permisos.esSuperadministrador(),
  };

  return (
    <UsuariosView
      usuariosIniciales={vm}
      areas={areasVM}
      ciudadesOperacion={ciudadesVM}
      modulos={modulos}
      permisos={permisos}
      usuarioActualId={usuario.id}
    />
  );
}
