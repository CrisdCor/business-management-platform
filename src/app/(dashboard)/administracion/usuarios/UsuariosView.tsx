"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, KeyRound, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import {
  crearUsuarioAction,
  actualizarUsuarioAction,
  resetearPasswordUsuarioAction,
  eliminarUsuarioDefinitivoAction,
} from "@/app/actions/usuarios";
import { ROLES, ROLE_LABELS, type RoleCode } from "@/domain/enums";
import type { PermisoRow } from "@/domain/entities/PermisoMatriz";
import type { UsuarioVM, OpcionCatalogo, ModuloOpcion, PermisosUsuariosVM } from "@/app/(dashboard)/administracion/usuarios/types";

const TODOS_LOS_ROLES = Object.values(ROLES) as RoleCode[];

function matrizVacia(modulos: ModuloOpcion[]): PermisoRow[] {
  return modulos.map((m) => ({ modulo: m.code, crear: false, leer: false, actualizar: false, eliminar: false }));
}

function generarPasswordTemporal(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return out + "!7";
}

export function UsuariosView({
  usuariosIniciales,
  areas,
  ciudadesOperacion,
  modulos,
  permisos,
  usuarioActualId,
}: {
  usuariosIniciales: UsuarioVM[];
  areas: OpcionCatalogo[];
  ciudadesOperacion: OpcionCatalogo[];
  modulos: ModuloOpcion[];
  permisos: PermisosUsuariosVM;
  usuarioActualId: string;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<UsuarioVM | null>(null);
  const [resetear, setResetear] = React.useState<UsuarioVM | null>(null);
  const [eliminar, setEliminar] = React.useState<UsuarioVM | null>(null);
  const [eliminando, setEliminando] = React.useState(false);
  const { notificar } = useToast();

  // Copia local del listado: se sincroniza con lo que manda el servidor, pero
  // además se actualiza al instante en `handleGuardado` con lo que se acaba de
  // guardar. Esto evita depender de que revalidatePath()/router.refresh() ya
  // hayan propagado la nueva prop antes de que el usuario reabra el modal (esa
  // carrera es la causa de que los cambios "parecieran" no guardarse: se
  // guardaban en la base de datos, pero al reabrir se leía todavía la lista
  // vieja).
  const [usuariosPropAnterior, setUsuariosPropAnterior] = React.useState(usuariosIniciales);
  const [usuarios, setUsuarios] = React.useState<UsuarioVM[]>(usuariosIniciales);
  // Ajuste de estado derivado de una prop durante el render (patrón
  // recomendado por React en vez de un useEffect) para resincronizar con el
  // servidor cuando `usuariosIniciales` cambia de identidad (p. ej. tras un
  // router.refresh() o una navegación).
  if (usuariosIniciales !== usuariosPropAnterior) {
    setUsuariosPropAnterior(usuariosIniciales);
    setUsuarios(usuariosIniciales);
  }

  function handleGuardado(vm: UsuarioVM) {
    setUsuarios((prev) => (prev.some((u) => u.id === vm.id) ? prev.map((u) => (u.id === vm.id ? vm : u)) : [vm, ...prev]));
  }

  async function handleEliminar() {
    if (!eliminar) return;
    setEliminando(true);
    const resultado = await eliminarUsuarioDefinitivoAction(eliminar.id);
    setEliminando(false);

    if (!resultado.ok) {
      notificar({ titulo: "No se pudo eliminar", descripcion: resultado.error, tono: "danger" });
      return;
    }

    setUsuarios((prev) => prev.filter((u) => u.id !== eliminar.id));
    notificar({ titulo: "Usuario eliminado", descripcion: `${eliminar.nombre} se borró de todas las tablas.`, tono: "success" });
    setEliminar(null);
  }

  const filtrados = usuarios.filter(
    (u) => !busqueda || u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.correo.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Roles, área y matriz de permisos por módulo."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nuevo usuario
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar por nombre o correo..." />

      {filtrados.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={6}>
                <EmptyState title="Sin usuarios" description="Crea el primer usuario del sistema." />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Usuario</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Ciudad de operación</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtrados.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar nombre={u.nombre} fotoUrl={u.fotoUrl} size={28} />
                    <div>
                      <div className="text-foreground">{u.nombre}</div>
                      <div className="text-xs text-muted-foreground">{u.correo}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{u.areaNombre ?? "—"}</TableCell>
                <TableCell>{u.ciudadOperacionNombre ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant="outline">
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.activo ? "success" : "neutral"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {permisos.puedeActualizar && (
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setEditar(u)}>
                        <Pencil className="size-3.5" /> Editar
                      </Button>
                      {u.id !== usuarioActualId && (
                        <Button variant="secondary" size="sm" onClick={() => setResetear(u)}>
                          <KeyRound className="size-3.5" /> Password
                        </Button>
                      )}
                      {permisos.puedeEliminar && u.id !== usuarioActualId && (
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={u.tieneMovimientos}
                          title={u.tieneMovimientos ? "Tiene requisiciones o compras registradas: no puede eliminarse." : undefined}
                          onClick={() => setEliminar(u)}
                        >
                          <Trash2 className="size-3.5" /> Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalUsuario
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        areas={areas}
        ciudadesOperacion={ciudadesOperacion}
        modulos={modulos}
        posiblesSupervisores={usuarios}
        onGuardado={handleGuardado}
      />
      <ModalUsuario
        usuario={editar}
        open={!!editar}
        onClose={() => setEditar(null)}
        areas={areas}
        ciudadesOperacion={ciudadesOperacion}
        modulos={modulos}
        posiblesSupervisores={usuarios.filter((u) => u.id !== editar?.id)}
        onGuardado={handleGuardado}
      />
      <ModalResetPassword usuario={resetear} onClose={() => setResetear(null)} />
      <ConfirmDialog
        open={!!eliminar}
        onClose={() => !eliminando && setEliminar(null)}
        onConfirm={handleEliminar}
        title="¿Eliminar este usuario?"
        description={
          eliminar
            ? `Se borrará por completo a ${eliminar.nombre} (${eliminar.correo}): su perfil, roles, permisos, notificaciones y la cuenta de acceso. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Sí, eliminar"
        variant="danger"
        loading={eliminando}
      />
    </div>
  );
}

function ModalResetPassword({ usuario, onClose }: { usuario: UsuarioVM | null; onClose: () => void }) {
  const [password, setPassword] = React.useState(generarPasswordTemporal());
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // Genera una nueva contraseña temporal cada vez que se abre el modal para un
    // usuario distinto; el formulario sigue montado durante la animación de salida.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (usuario) setPassword(generarPasswordTemporal());
  }, [usuario]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    setError(null);
    if (password.length < 6) return setError("Mínimo 6 caracteres.");

    setCargando(true);
    const resultado = await resetearPasswordUsuarioAction(usuario.id, password);
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo resetear la contraseña.");

    notificar({ titulo: "Contraseña reseteada", descripcion: `Compártesela a ${usuario.nombre} de forma segura.`, tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={!!usuario}
      onClose={onClose}
      title={`Resetear contraseña`}
      description={usuario ? `${usuario.nombre} · ${usuario.correo}` : undefined}
      width="sm"
      footer={
        <Button form="form-reset" type="submit" loading={cargando}>
          Confirmar reseteo
        </Button>
      }
    >
      <form id="form-reset" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="reset-password">Nueva contraseña temporal</Label>
          <Input id="reset-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <FieldHint>Se generó automáticamente; puedes editarla antes de confirmar.</FieldHint>
        </div>
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}

function ModalUsuario({
  open,
  onClose,
  usuario,
  areas,
  ciudadesOperacion,
  modulos,
  posiblesSupervisores,
  onGuardado,
}: {
  open: boolean;
  onClose: () => void;
  usuario?: UsuarioVM | null;
  areas: OpcionCatalogo[];
  ciudadesOperacion: OpcionCatalogo[];
  modulos: ModuloOpcion[];
  posiblesSupervisores: UsuarioVM[];
  onGuardado: (usuario: UsuarioVM) => void;
}) {
  const esEdicion = !!usuario;
  const router = useRouter();
  const [nombre, setNombre] = React.useState("");
  const [correo, setCorreo] = React.useState("");
  const [areaId, setAreaId] = React.useState("");
  const [ciudadOperacionId, setCiudadOperacionId] = React.useState("");
  const [supervisorId, setSupervisorId] = React.useState("");
  const [roles, setRoles] = React.useState<RoleCode[]>([]);
  const [matriz, setMatriz] = React.useState<PermisoRow[]>(matrizVacia(modulos));
  const [passwordTemporal, setPasswordTemporal] = React.useState("");
  const [activo, setActivo] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // El formulario permanece montado durante la animación de salida del SlideOver;
    // se reinicia explícitamente al cambiar de registro en vez de usar `key`.
    if (usuario) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre(usuario.nombre);
      setCorreo(usuario.correo);
      setAreaId(usuario.areaId ?? "");
      setCiudadOperacionId(usuario.ciudadOperacionId ?? "");
      setSupervisorId(usuario.supervisorId ?? "");
      setRoles(usuario.roles);
      setMatriz(modulos.map((m) => usuario.permisos.find((p) => p.modulo === m.code) ?? { modulo: m.code, crear: false, leer: false, actualizar: false, eliminar: false }));
      setActivo(usuario.activo);
    } else {
      setNombre("");
      setCorreo("");
      setAreaId("");
      setCiudadOperacionId("");
      setSupervisorId("");
      setRoles([]);
      setMatriz(matrizVacia(modulos));
      setPasswordTemporal(generarPasswordTemporal());
      setActivo(true);
    }
    setError(null);
  }, [usuario, open, modulos]);

  function alternarRol(rol: RoleCode) {
    setRoles((prev) => (prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]));
  }

  function alternarPermiso(modulo: string, accion: keyof Omit<PermisoRow, "modulo">) {
    setMatriz((prev) => prev.map((p) => (p.modulo === modulo ? { ...p, [accion]: !p[accion] } : p)));
  }

  /** Marca o desmarca de una sola vez las cuatro acciones de un módulo. */
  function alternarFilaCompleta(modulo: string) {
    setMatriz((prev) =>
      prev.map((p) => {
        if (p.modulo !== modulo) return p;
        const todosActivos = p.crear && p.leer && p.actualizar && p.eliminar;
        const nuevoValor = !todosActivos;
        return { ...p, crear: nuevoValor, leer: nuevoValor, actualizar: nuevoValor, eliminar: nuevoValor };
      }),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (!esEdicion && !correo.trim()) return setError("El correo es obligatorio.");
    if (roles.length === 0) return setError("Selecciona al menos un rol.");
    if (!esEdicion && passwordTemporal.length < 6) return setError("La contraseña temporal debe tener al menos 6 caracteres.");

    setCargando(true);
    let ok: boolean;
    let mensajeError: string | undefined;
    let idGuardado: string | undefined;
    if (esEdicion) {
      const resultado = await actualizarUsuarioAction(usuario!.id, {
        nombre,
        areaId: areaId || null,
        ciudadOperacionId: ciudadOperacionId || null,
        supervisorId: supervisorId || null,
        activo,
        roles,
        permisos: matriz,
      });
      ok = resultado.ok;
      mensajeError = resultado.error;
      idGuardado = usuario!.id;
    } else {
      const resultado = await crearUsuarioAction({
        nombre,
        correo,
        areaId: areaId || null,
        ciudadOperacionId: ciudadOperacionId || null,
        supervisorId: supervisorId || null,
        roles,
        permisos: matriz,
        passwordTemporal,
      });
      ok = resultado.ok;
      mensajeError = resultado.error;
      idGuardado = resultado.id;
    }
    setCargando(false);

    if (!ok) return setError(mensajeError ?? "No se pudo guardar el usuario.");

    notificar({
      titulo: esEdicion ? "Usuario actualizado" : "Usuario creado",
      descripcion: !esEdicion ? `Contraseña temporal: ${passwordTemporal}` : undefined,
      tono: "success",
    });

    // Refleja de inmediato lo recién guardado en la lista del padre: no depende
    // de que revalidatePath()/router.refresh() ya hayan traído la prop
    // actualizada (esa carrera era la causa real de que roles/permisos
    // "parecieran" no guardarse al reabrir justo después de guardar).
    if (idGuardado) {
      onGuardado({
        id: idGuardado,
        nombre,
        correo: esEdicion ? usuario!.correo : correo,
        areaId: areaId || null,
        areaNombre: areas.find((a) => a.id === areaId)?.nombre ?? null,
        ciudadOperacionId: ciudadOperacionId || null,
        ciudadOperacionNombre: ciudadesOperacion.find((c) => c.id === ciudadOperacionId)?.nombre ?? null,
        supervisorId: supervisorId || null,
        supervisorNombre: posiblesSupervisores.find((s) => s.id === supervisorId)?.nombre ?? null,
        roles,
        activo,
        fotoUrl: esEdicion ? usuario!.fotoUrl : null,
        permisos: matriz,
        tieneMovimientos: esEdicion ? usuario!.tieneMovimientos : false,
      });
    }

    onClose();
    // Además, fuerza un refetch del servidor en segundo plano para mantener
    // sincronizado lo que vería otra pestaña/administrador.
    router.refresh();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar usuario" : "Nuevo usuario"}
      width="lg"
      footer={
        <Button type="submit" form="form-usuario" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-usuario" onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="us-nombre">Nombre</Label>
            <Input id="us-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="us-correo">Correo</Label>
            <Input id="us-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} disabled={esEdicion} />
          </div>
          <div>
            <Label htmlFor="us-area">Área</Label>
            <Select id="us-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">Sin área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="us-ciudad">Ciudad de operación</Label>
            <Select id="us-ciudad" value={ciudadOperacionId} onChange={(e) => setCiudadOperacionId(e.target.value)}>
              <option value="">Sin ciudad</option>
              {ciudadesOperacion.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="us-supervisor">Supervisor (opcional)</Label>
            <Select id="us-supervisor" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
              <option value="">Sin supervisor asignado</option>
              {posiblesSupervisores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
            <FieldHint>Quien aprueba las requisiciones de este usuario.</FieldHint>
          </div>
          {!esEdicion && (
            <div>
              <Label htmlFor="us-password">Contraseña temporal</Label>
              <Input id="us-password" value={passwordTemporal} onChange={(e) => setPasswordTemporal(e.target.value)} />
            </div>
          )}
          {esEdicion && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-[13px] text-foreground">
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 rounded border-input" />
                Usuario activo
              </label>
            </div>
          )}
        </div>

        <div>
          <Label>Roles (puede tener varios)</Label>
          <div className="flex flex-wrap gap-3">
            {TODOS_LOS_ROLES.map((rol) => (
              <label key={rol} className="flex items-center gap-1.5 text-[13px] text-foreground">
                <input type="checkbox" checked={roles.includes(rol)} onChange={() => alternarRol(rol)} className="size-4 rounded border-input" />
                {ROLE_LABELS[rol]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Matriz de módulos y permisos</Label>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-2 py-2 text-center font-medium text-muted-foreground">Todos</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Módulo</th>
                  <th className="px-2 py-2 text-center font-medium text-muted-foreground">Crear</th>
                  <th className="px-2 py-2 text-center font-medium text-muted-foreground">Leer</th>
                  <th className="px-2 py-2 text-center font-medium text-muted-foreground">Actualizar</th>
                  <th className="px-2 py-2 text-center font-medium text-muted-foreground">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modulos.map((m) => {
                  const fila = matriz.find((p) => p.modulo === m.code);
                  const todosActivos = !!fila && fila.crear && fila.leer && fila.actualizar && fila.eliminar;
                  return (
                    <tr key={m.code}>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={todosActivos}
                          onChange={() => alternarFilaCompleta(m.code)}
                          title="Seleccionar toda la fila"
                          className="size-4 rounded border-input"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-foreground">{m.label}</td>
                      {(["crear", "leer", "actualizar", "eliminar"] as const).map((accion) => (
                        <td key={accion} className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={fila?.[accion] ?? false}
                            onChange={() => alternarPermiso(m.code, accion)}
                            className="size-4 rounded border-input"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <FieldHint>El Superadministrador siempre tiene acceso total, sin importar esta matriz.</FieldHint>
        </div>

        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
