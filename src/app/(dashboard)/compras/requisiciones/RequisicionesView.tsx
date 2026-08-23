"use client";

import * as React from "react";
import { Plus, Check, X as XIcon, Clock, Trash2, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Select } from "@/components/ui/Select";
import { Input, Label, Textarea, FieldError, FieldHint } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui/Table";
import { BadgeEstadoRequisicion } from "@/components/compras/estado-badges";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { ESTADO_REQUISICION } from "@/domain/enums";
import {
  crearRequisicionAction,
  editarRequisicionAction,
  aprobarRequisicionAction,
  rechazarRequisicionAction,
} from "@/app/actions/requisiciones";
import type {
  RequisicionVM,
  ProductoOpcionVM,
  PermisosRequisicionesVM,
  SolicitanteVM,
} from "@/app/(dashboard)/compras/requisiciones/types";

const SEMAFORO_ETIQUETA: Record<"verde" | "amarillo" | "rojo", string> = {
  verde: "en plazo",
  amarillo: "vence pronto",
  rojo: "plazo vencido",
};

const SEMAFORO_DOT: Record<"verde" | "amarillo" | "rojo", string> = {
  verde: "bg-success",
  amarillo: "bg-warning",
  rojo: "bg-danger",
};

function SemaforoBadge({ estado }: { estado: "verde" | "amarillo" | "rojo" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${SEMAFORO_DOT[estado]}`} />
      {SEMAFORO_ETIQUETA[estado]}
    </span>
  );
}

export function RequisicionesView({
  requisicionesIniciales,
  productos,
  solicitante,
  permisos,
}: {
  requisicionesIniciales: RequisicionVM[];
  productos: ProductoOpcionVM[];
  solicitante: SolicitanteVM;
  permisos: PermisosRequisicionesVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [filtroEstado, setFiltroEstado] = React.useState<string>("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<RequisicionVM | null>(null);
  const [rechazar, setRechazar] = React.useState<RequisicionVM | null>(null);
  const [verItems, setVerItems] = React.useState<RequisicionVM | null>(null);

  const filtradas = requisicionesIniciales.filter((r) => {
    const coincideBusqueda =
      !busqueda ||
      r.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.descripcion ?? "").toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = !filtroEstado || r.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  return (
    <div>
      <PageHeader
        title="Requisiciones"
        description="Solicitudes de compra por producto, cantidad y observación."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nueva requisición
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar por folio o descripción...">
        <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-48">
          <option value="">Todos los estados</option>
          <option value={ESTADO_REQUISICION.PENDIENTE}>Pendiente</option>
          <option value={ESTADO_REQUISICION.APROBADA}>Aprobada</option>
          <option value={ESTADO_REQUISICION.RECHAZADA}>Rechazada</option>
          <option value={ESTADO_REQUISICION.EN_COMPRA}>En gestión de compra</option>
          <option value={ESTADO_REQUISICION.CERRADA}>Cerrada</option>
        </Select>
      </FilterBar>

      {filtradas.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={7}>
                <EmptyState
                  title="No hay requisiciones"
                  description="Cuando se cree una requisición aparecerá aquí."
                />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Folio</TableHead>
              <TableHead>Área / Ciudad</TableHead>
              <TableHead>Ítems</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Solicitud / Aprobación</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtradas.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.folio}</TableCell>
                <TableCell>
                  <div className="text-foreground">{r.areaNombre}</div>
                  <div className="text-xs text-muted-foreground">{r.ciudadOperacionNombre}</div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setVerItems(r)}
                    className="inline-flex items-center gap-1 text-xs text-info hover:underline"
                  >
                    <Eye className="size-3.5" /> {r.items.length} ítem{r.items.length === 1 ? "" : "s"}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <BadgeEstadoRequisicion estado={r.estado} />
                      {r.plazoVencido && (
                        <Badge variant="danger">
                          <Clock className="size-3" /> plazo vencido
                        </Badge>
                      )}
                    </div>
                    {r.estadoSemaforo && <SemaforoBadge estado={r.estadoSemaforo} />}
                    {r.estado === ESTADO_REQUISICION.RECHAZADA && r.motivoRechazo && (
                      <p className="max-w-[220px] truncate text-xs text-muted-foreground" title={r.motivoRechazo}>
                        Motivo: {r.motivoRechazo}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-foreground">{formatDate(r.createdAt)}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.fechaAprobacion ? formatDate(r.fechaAprobacion) : "—"}
                  </div>
                </TableCell>
                <TableCell>{r.solicitanteNombre}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {r.puedeEditar && (
                      <Button variant="outline" size="sm" onClick={() => setEditar(r)}>
                        <Pencil className="size-3.5" /> Editar
                      </Button>
                    )}
                    {r.estado === ESTADO_REQUISICION.PENDIENTE && (
                      <>
                        {r.puedeAprobar && <AprobarBoton id={r.id} />}
                        {permisos.puedeRechazar && (
                          <Button variant="outline" size="sm" onClick={() => setRechazar(r)}>
                            <XIcon className="size-3.5" /> Rechazar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalRequisicion
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        productos={productos}
        solicitante={solicitante}
      />
      <ModalRequisicion
        open={!!editar}
        onClose={() => setEditar(null)}
        productos={productos}
        solicitante={solicitante}
        requisicion={editar}
      />
      <ModalRechazar requisicion={rechazar} onClose={() => setRechazar(null)} />
      <ModalVerItems requisicion={verItems} onClose={() => setVerItems(null)} />
    </div>
  );
}

function AprobarBoton({ id }: { id: string }) {
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  async function onAprobar() {
    setCargando(true);
    const resultado = await aprobarRequisicionAction(id);
    setCargando(false);
    if (resultado.ok) {
      notificar({ titulo: "Requisición aprobada", tono: "success" });
    } else {
      notificar({ titulo: "No se pudo aprobar", descripcion: resultado.error, tono: "danger" });
    }
  }

  return (
    <Button size="sm" loading={cargando} onClick={onAprobar}>
      <Check className="size-3.5" /> Aprobar
    </Button>
  );
}

function ModalVerItems({ requisicion, onClose }: { requisicion: RequisicionVM | null; onClose: () => void }) {
  return (
    <SlideOver open={!!requisicion} onClose={onClose} title={`Ítems de ${requisicion?.folio ?? ""}`} width="md">
      {requisicion && (
        <div className="flex flex-col gap-3">
          {requisicion.descripcion && (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">{requisicion.descripcion}</p>
          )}
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Producto</TableHead>
                <TableHead>Rubro</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Observación</TableHead>
                <TableHead>Comprado</TableHead>
                <TableHead>Anulado</TableHead>
                <TableHead>Pendiente</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {requisicion.items.map((it) => {
                const unidad = it.unidadMedidaAbreviatura ?? it.unidadMedidaNombre;
                return (
                  <TableRow key={it.id}>
                    <TableCell>{it.productoNombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.rubroNombre}</TableCell>
                    <TableCell>
                      {it.cantidad} {unidad}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                      {it.observacion ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{it.cantidadComprada} {unidad}</TableCell>
                    <TableCell className="text-xs" title={it.motivoAnulacion ?? undefined}>
                      {it.cantidadAnulada} {unidad}
                    </TableCell>
                    <TableCell>
                      <Badge variant={it.cantidadPendiente > 0 ? "neutral" : "success"}>
                        {it.cantidadPendiente} {unidad}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SlideOver>
  );
}

function ModalRechazar({ requisicion, onClose }: { requisicion: RequisicionVM | null; onClose: () => void }) {
  const [motivo, setMotivo] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // El formulario permanece montado durante la animación de salida del SlideOver;
    // se reinicia explícitamente al cambiar de registro en vez de usar `key`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (requisicion) setMotivo("");
  }, [requisicion]);

  async function onConfirm() {
    if (!requisicion) return;
    setCargando(true);
    const resultado = await rechazarRequisicionAction(requisicion.id, motivo);
    setCargando(false);
    if (resultado.ok) {
      notificar({ titulo: "Requisición rechazada", tono: "info" });
      onClose();
    } else {
      notificar({ titulo: "No se pudo rechazar", descripcion: resultado.error, tono: "danger" });
    }
  }

  return (
    <SlideOver
      open={!!requisicion}
      onClose={onClose}
      title={`Rechazar ${requisicion?.folio ?? ""}`}
      width="sm"
      footer={
        <Button variant="danger" loading={cargando} onClick={onConfirm}>
          Rechazar requisición
        </Button>
      }
    >
      <Label htmlFor="motivo-rechazo">Motivo del rechazo</Label>
      <Textarea
        id="motivo-rechazo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Explica brevemente por qué se rechaza... se notificará al solicitante."
      />
    </SlideOver>
  );
}

interface FilaItem {
  key: number;
  productoId: string;
  cantidad: string;
  observacion: string;
}

let contadorFila = 0;
function nuevaFila(): FilaItem {
  contadorFila += 1;
  return { key: contadorFila, productoId: "", cantidad: "", observacion: "" };
}

function filaDesdeItem(it: RequisicionVM["items"][number]): FilaItem {
  contadorFila += 1;
  return {
    key: contadorFila,
    productoId: it.productoId,
    cantidad: String(it.cantidad),
    observacion: it.observacion ?? "",
  };
}

function ModalRequisicion({
  open,
  onClose,
  productos,
  solicitante,
  requisicion = null,
}: {
  open: boolean;
  onClose: () => void;
  productos: ProductoOpcionVM[];
  solicitante: SolicitanteVM;
  requisicion?: RequisicionVM | null;
}) {
  const editando = !!requisicion;
  const [descripcion, setDescripcion] = React.useState(requisicion?.descripcion ?? "");
  const [filas, setFilas] = React.useState<FilaItem[]>(
    requisicion && requisicion.items.length > 0 ? requisicion.items.map(filaDesdeItem) : [nuevaFila()],
  );
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // El formulario permanece montado durante la animación de salida del SlideOver;
    // se reinicia explícitamente según el registro en edición al abrir, en vez de usar `key`.
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescripcion(requisicion?.descripcion ?? "");
    setFilas(requisicion && requisicion.items.length > 0 ? requisicion.items.map(filaDesdeItem) : [nuevaFila()]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requisicion?.id]);

  function limpiar() {
    setDescripcion("");
    setFilas([nuevaFila()]);
    setError(null);
  }

  function actualizarFila(key: number, cambios: Partial<FilaItem>) {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, nuevaFila()]);
  }

  function quitarFila(key: number) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.key !== key) : prev));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const items = filas.filter((f) => f.productoId);
    if (items.length === 0) return setError("Agrega al menos un producto.");

    for (const f of items) {
      const cantidadNumero = Number(f.cantidad);
      if (!cantidadNumero || cantidadNumero <= 0) {
        return setError("Cada ítem debe tener una cantidad mayor a cero.");
      }
    }

    setCargando(true);
    const itemsInput = items.map((f) => ({
      productoId: f.productoId,
      cantidad: Number(f.cantidad),
      observacion: f.observacion.trim() || null,
    }));
    const resultado = editando
      ? await editarRequisicionAction(requisicion!.id, { descripcion: descripcion.trim() || null, items: itemsInput })
      : await crearRequisicionAction({ descripcion: descripcion.trim() || null, items: itemsInput });
    setCargando(false);

    if (!resultado.ok) {
      return setError(resultado.error ?? (editando ? "No se pudo editar la requisición." : "No se pudo crear la requisición."));
    }

    notificar({ titulo: editando ? "Requisición actualizada" : "Requisición creada", tono: "success" });
    if (!editando) limpiar();
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={editando ? `Editar ${requisicion?.folio ?? ""}` : "Nueva requisición"}
      description={editando ? "Solo se puede editar mientras siga pendiente de aprobación." : "Se enviará a aprobación según tu rol."}
      width="xl"
      footer={
        <Button type="submit" form={editando ? "form-editar-requisicion" : "form-crear-requisicion"} loading={cargando}>
          {editando ? "Guardar cambios" : "Crear requisición"}
        </Button>
      }
    >
      <form
        id={editando ? "form-editar-requisicion" : "form-crear-requisicion"}
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Área</Label>
            <Input value={solicitante.areaNombre} disabled readOnly />
          </div>
          <div>
            <Label>Ciudad de operación</Label>
            <Input value={solicitante.ciudadOperacionNombre} disabled readOnly />
          </div>
        </div>
        <FieldHint>El área y la ciudad se toman de tu perfil y no son editables.</FieldHint>

        <div>
          <Label htmlFor="req-descripcion">Nota general (opcional)</Label>
          <Textarea
            id="req-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Contexto adicional de la solicitud, si aplica..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Productos solicitados</Label>
            <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
              <Plus className="size-3.5" /> Agregar ítem
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {filas.map((fila, idx) => {
              const producto = productos.find((p) => p.id === fila.productoId);
              return (
                <div key={fila.key} className="rounded-md border border-border p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`producto-${fila.key}`}>Producto {idx + 1}</Label>
                      <Select
                        id={`producto-${fila.key}`}
                        value={fila.productoId}
                        onChange={(e) => actualizarFila(fila.key, { productoId: e.target.value })}
                      >
                        <option value="">Selecciona un producto</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </Select>
                      {producto && (
                        <FieldHint>
                          Rubro: {producto.rubroNombre} · Unidad: {producto.unidadMedidaNombre}
                        </FieldHint>
                      )}
                    </div>
                    <div className="w-28">
                      <Label htmlFor={`cantidad-${fila.key}`}>Cantidad</Label>
                      <Input
                        id={`cantidad-${fila.key}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={fila.cantidad}
                        onChange={(e) => actualizarFila(fila.key, { cantidad: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarFila(fila.key)}
                      disabled={filas.length === 1}
                      className="mt-6 rounded-md p-2 text-muted-foreground transition-colors hover:bg-danger-bg hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Quitar ítem"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <Label htmlFor={`observacion-${fila.key}`}>Observación (opcional)</Label>
                    <Input
                      id={`observacion-${fila.key}`}
                      value={fila.observacion}
                      onChange={(e) => actualizarFila(fila.key, { observacion: e.target.value })}
                      placeholder="Detalle específico de este ítem..."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
