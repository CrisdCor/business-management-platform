"use client";

import * as React from "react";
import { Plus, FileDown, ShieldCheck, Truck, CheckCheck, Eye, Ban } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Select } from "@/components/ui/Select";
import { Input, Label, Textarea, FieldError, FieldHint } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui/Table";
import { BadgeEstadoCompra } from "@/components/compras/estado-badges";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ESTADO_COMPRA } from "@/domain/enums";
import {
  registrarCompraAction,
  aprobarExcesoCompraAction,
  marcarCompraEnviadaAction,
  cerrarCompraAction,
} from "@/app/actions/compras";
import { anularSaldoRequisicionItemAction } from "@/app/actions/requisiciones";
import type {
  CompraVM,
  ItemPendienteCompraVM,
  ProveedorOpcionVM,
  PermisosOrdenesVM,
} from "@/app/(dashboard)/compras/ordenes/types";

export function OrdenesView({
  comprasIniciales,
  itemsPendientes,
  proveedores,
  permisos,
}: {
  comprasIniciales: CompraVM[];
  itemsPendientes: ItemPendienteCompraVM[];
  proveedores: ProveedorOpcionVM[];
  permisos: PermisosOrdenesVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalRegistrar, setModalRegistrar] = React.useState(false);
  const [verItems, setVerItems] = React.useState<CompraVM | null>(null);
  const [anularItem, setAnularItem] = React.useState<ItemPendienteCompraVM | null>(null);
  const { notificar } = useToast();

  const filtradas = comprasIniciales.filter(
    (c) =>
      !busqueda ||
      c.folioOc.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.requisicionesFolios.some((f) => f.toLowerCase().includes(busqueda.toLowerCase())),
  );

  async function accion(fn: () => Promise<{ ok: boolean; error?: string }>, mensajeOk: string) {
    const resultado = await fn();
    if (resultado.ok) notificar({ titulo: mensajeOk, tono: "success" });
    else notificar({ titulo: "No se pudo completar la acción", descripcion: resultado.error, tono: "danger" });
  }

  return (
    <div>
      <PageHeader
        title="Compras / Órdenes de compra"
        description="Gestión de compras a partir de los ítems pendientes de requisiciones aprobadas."
        action={
          permisos.puedeRegistrar &&
          itemsPendientes.length > 0 && (
            <Button onClick={() => setModalRegistrar(true)}>
              <Plus className="size-4" /> Registrar compra
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar por OC o folio de requisición..." />

      {filtradas.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={7}>
                <EmptyState
                  title="No hay compras registradas"
                  description="Registra una compra a partir de los ítems pendientes de una o varias requisiciones aprobadas."
                />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>OC</TableHead>
              <TableHead>Requisiciones</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Monto total</TableHead>
              <TableHead>Entrega estimada</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtradas.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.folioOc}</TableCell>
                <TableCell>
                  <div className="font-mono text-xs text-foreground">{c.requisicionesFolios.join(", ") || "—"}</div>
                  <button
                    onClick={() => setVerItems(c)}
                    className="inline-flex items-center gap-1 text-xs text-info hover:underline"
                  >
                    <Eye className="size-3" /> {c.items.length} ítem{c.items.length === 1 ? "" : "s"}
                  </button>
                </TableCell>
                <TableCell>{c.proveedorNombre}</TableCell>
                <TableCell>
                  {formatCurrency(c.montoTotal)}
                  {c.excedePresupuesto && (
                    <Badge variant="warning" className="ml-1.5">
                      excede presupuesto
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {c.fechaEntregaEstimada ? formatDate(c.fechaEntregaEstimada) : "—"}
                  {c.diasParaEntrega !== null && c.diasParaEntrega >= 0 && c.estado !== "cerrada" && (
                    <span className="ml-1.5 text-xs text-muted-foreground">({c.diasParaEntrega}d)</span>
                  )}
                </TableCell>
                <TableCell>
                  <BadgeEstadoCompra estado={c.estado} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <a href={`/api/compras/${c.id}/oc`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <FileDown className="size-3.5" /> OC
                      </Button>
                    </a>

                    {permisos.esSuperadministrador && c.estado === ESTADO_COMPRA.PENDIENTE_APROBACION_EXCESO && (
                      <Button
                        size="sm"
                        onClick={() => accion(() => aprobarExcesoCompraAction(c.id), "Compra aprobada")}
                      >
                        <ShieldCheck className="size-3.5" /> Aprobar exceso
                      </Button>
                    )}

                    {permisos.puedeGestionar && c.estado === ESTADO_COMPRA.EN_PROCESO && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => accion(() => marcarCompraEnviadaAction(c.id), "Marcada como enviada")}
                      >
                        <Truck className="size-3.5" /> Enviada
                      </Button>
                    )}

                    {permisos.puedeGestionar &&
                      (c.estado === ESTADO_COMPRA.ENVIADA || c.estado === ESTADO_COMPRA.EN_PROCESO) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => accion(() => cerrarCompraAction(c.id), "Compra cerrada")}
                        >
                          <CheckCheck className="size-3.5" /> Cerrar
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalRegistrarCompra
        open={modalRegistrar}
        onClose={() => setModalRegistrar(false)}
        itemsPendientes={itemsPendientes}
        proveedores={proveedores}
        onAnular={(item) => setAnularItem(item)}
        puedeAnular={permisos.puedeGestionar}
      />
      <ModalVerItemsCompra compra={verItems} onClose={() => setVerItems(null)} />
      <ModalAnularSaldo item={anularItem} onClose={() => setAnularItem(null)} />
    </div>
  );
}

function ModalVerItemsCompra({ compra, onClose }: { compra: CompraVM | null; onClose: () => void }) {
  return (
    <SlideOver open={!!compra} onClose={onClose} title={`Ítems de ${compra?.folioOc ?? ""}`} width="md">
      {compra && (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Folio</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio unitario</TableHead>
              <TableHead>Subtotal</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {compra.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-mono text-xs">{it.requisicionFolio}</TableCell>
                <TableCell>{it.productoNombre}</TableCell>
                <TableCell>
                  {it.cantidad} {it.unidadMedidaAbreviatura ?? it.unidadMedidaNombre}
                </TableCell>
                <TableCell>{formatCurrency(it.precioUnitario)}</TableCell>
                <TableCell>{formatCurrency(it.cantidad * it.precioUnitario)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SlideOver>
  );
}

function ModalAnularSaldo({ item, onClose }: { item: ItemPendienteCompraVM | null; onClose: () => void }) {
  const [motivo, setMotivo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // El formulario permanece montado durante la animación de salida del SlideOver;
    // se reinicia explícitamente al cambiar de ítem en vez de usar `key`.
    if (!item) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotivo("");
    setError(null);
  }, [item]);

  async function onConfirm() {
    if (!item) return;
    if (!motivo.trim()) return setError("Debes indicar el motivo de la anulación.");
    setCargando(true);
    const resultado = await anularSaldoRequisicionItemAction(item.id, motivo.trim());
    setCargando(false);
    if (resultado.ok) {
      notificar({ titulo: "Saldo anulado", tono: "info" });
      onClose();
    } else {
      notificar({ titulo: "No se pudo anular el saldo", descripcion: resultado.error, tono: "danger" });
    }
  }

  return (
    <SlideOver
      open={!!item}
      onClose={onClose}
      title="Anular saldo pendiente"
      description={item ? `${item.productoNombre} · Folio ${item.requisicionFolio}` : undefined}
      width="sm"
      footer={
        <Button variant="danger" loading={cargando} onClick={onConfirm}>
          Anular saldo
        </Button>
      }
    >
      {item && (
        <div className="flex flex-col gap-3">
          <p className="rounded-md bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">
            Se anulará el saldo pendiente completo de este ítem: {item.cantidadPendiente}{" "}
            {item.unidadMedidaAbreviatura ?? item.unidadMedidaNombre}. Esta acción no se puede deshacer.
          </p>
          <div>
            <Label htmlFor="motivo-anulacion">Motivo (obligatorio)</Label>
            <Textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica por qué no se comprará este saldo..."
            />
          </div>
          <FieldError>{error}</FieldError>
        </div>
      )}
    </SlideOver>
  );
}

interface SeleccionItem {
  cantidad: string;
  precioUnitario: string;
}

function ModalRegistrarCompra({
  open,
  onClose,
  itemsPendientes,
  proveedores,
  onAnular,
  puedeAnular,
}: {
  open: boolean;
  onClose: () => void;
  itemsPendientes: ItemPendienteCompraVM[];
  proveedores: ProveedorOpcionVM[];
  onAnular: (item: ItemPendienteCompraVM) => void;
  puedeAnular: boolean;
}) {
  const [areaCiudad, setAreaCiudad] = React.useState("");
  const [proveedorId, setProveedorId] = React.useState("");
  const [seleccion, setSeleccion] = React.useState<Record<string, SeleccionItem>>({});
  const [fechaEntrega, setFechaEntrega] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // El formulario permanece montado durante la animación de salida del SlideOver;
    // se reinicia explícitamente al reabrirlo en vez de usar `key`.
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAreaCiudad("");
    setProveedorId("");
    setSeleccion({});
    setFechaEntrega("");
    setNotas("");
    setError(null);
  }, [open]);

  const combinaciones = React.useMemo(() => {
    const mapa = new Map<string, { areaNombre: string; ciudadOperacionNombre: string }>();
    for (const it of itemsPendientes) {
      const key = `${it.areaId}|${it.ciudadOperacionId ?? ""}`;
      if (!mapa.has(key)) mapa.set(key, { areaNombre: it.areaNombre, ciudadOperacionNombre: it.ciudadOperacionNombre });
    }
    return Array.from(mapa.entries()).map(([key, v]) => ({ key, ...v }));
  }, [itemsPendientes]);

  const itemsFiltrados = React.useMemo(
    () => itemsPendientes.filter((it) => `${it.areaId}|${it.ciudadOperacionId ?? ""}` === areaCiudad),
    [itemsPendientes, areaCiudad],
  );

  function actualizarSeleccion(itemId: string, cambios: Partial<SeleccionItem>) {
    setSeleccion((prev) => ({
      ...prev,
      [itemId]: { cantidad: prev[itemId]?.cantidad ?? "", precioUnitario: prev[itemId]?.precioUnitario ?? "", ...cambios },
    }));
  }

  function alternarItem(item: ItemPendienteCompraVM, marcado: boolean) {
    setSeleccion((prev) => {
      const siguiente = { ...prev };
      if (marcado) {
        siguiente[item.id] = { cantidad: String(item.cantidadPendiente), precioUnitario: prev[item.id]?.precioUnitario ?? "" };
      } else {
        delete siguiente[item.id];
      }
      return siguiente;
    });
  }

  const itemsSeleccionados = itemsFiltrados.filter((it) => seleccion[it.id]);
  const totalEstimado = itemsSeleccionados.reduce((acc, it) => {
    const s = seleccion[it.id];
    const cantidad = Number(s?.cantidad) || 0;
    const precio = Number(s?.precioUnitario) || 0;
    return acc + cantidad * precio;
  }, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!areaCiudad) return setError("Selecciona el área y ciudad de operación.");
    if (!proveedorId) return setError("Selecciona el proveedor.");
    if (itemsSeleccionados.length === 0) return setError("Selecciona al menos un ítem a comprar.");

    for (const it of itemsSeleccionados) {
      const s = seleccion[it.id];
      const cantidad = Number(s?.cantidad);
      const precio = Number(s?.precioUnitario);
      if (!cantidad || cantidad <= 0) return setError(`La cantidad de "${it.productoNombre}" debe ser mayor a cero.`);
      if (cantidad > it.cantidadPendiente) {
        return setError(`La cantidad de "${it.productoNombre}" no puede superar el saldo pendiente (${it.cantidadPendiente}).`);
      }
      if (!precio || precio <= 0) return setError(`Ingresa el precio unitario de "${it.productoNombre}".`);
    }

    setCargando(true);
    const resultado = await registrarCompraAction({
      proveedorId,
      items: itemsSeleccionados.map((it) => ({
        requisicionItemId: it.id,
        cantidad: Number(seleccion[it.id]!.cantidad),
        precioUnitario: Number(seleccion[it.id]!.precioUnitario),
      })),
      fechaEntregaEstimada: fechaEntrega ? new Date(fechaEntrega).toISOString() : null,
      notas: notas.trim() || null,
    });
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo registrar la compra.");

    notificar({ titulo: "Compra registrada", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Registrar compra"
      description="Puedes cruzar ítems de varias requisiciones, siempre que compartan área y ciudad de operación. Se genera la Orden de Compra (OC)."
      width="xl"
      footer={
        <Button type="submit" form="form-compra" loading={cargando}>
          Registrar compra
        </Button>
      }
    >
      <form id="form-compra" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="compra-area-ciudad">Área · Ciudad de operación</Label>
          <Select
            id="compra-area-ciudad"
            value={areaCiudad}
            onChange={(e) => {
              setAreaCiudad(e.target.value);
              setSeleccion({});
            }}
          >
            <option value="">Selecciona área y ciudad</option>
            {combinaciones.map((c) => (
              <option key={c.key} value={c.key}>
                {c.areaNombre} · {c.ciudadOperacionNombre}
              </option>
            ))}
          </Select>
          <FieldHint>Todos los ítems de una misma compra deben pertenecer a requisiciones de la misma área y ciudad.</FieldHint>
        </div>

        {areaCiudad && (
          <div className="flex flex-col gap-2">
            <Label>Ítems pendientes ({itemsFiltrados.length})</Label>
            {itemsFiltrados.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay ítems pendientes para esta combinación.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {itemsFiltrados.map((it) => {
                  const sel = seleccion[it.id];
                  const unidad = it.unidadMedidaAbreviatura ?? it.unidadMedidaNombre;
                  return (
                    <div key={it.id} className="flex items-start gap-2 rounded-md border border-border p-2.5">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 rounded border-input"
                        checked={!!sel}
                        onChange={(e) => alternarItem(it, e.target.checked)}
                      />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-foreground">{it.productoNombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Folio {it.requisicionFolio} · Pendiente: {it.cantidadPendiente} {unidad} · {it.rubroNombre}
                          {it.observacion ? ` · ${it.observacion}` : ""}
                        </p>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min={0}
                          max={it.cantidadPendiente}
                          step="0.01"
                          placeholder="Cantidad"
                          disabled={!sel}
                          value={sel?.cantidad ?? ""}
                          onChange={(e) => actualizarSeleccion(it.id, { cantidad: e.target.value })}
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Precio unitario"
                          disabled={!sel}
                          value={sel?.precioUnitario ?? ""}
                          onChange={(e) => actualizarSeleccion(it.id, { precioUnitario: e.target.value })}
                        />
                      </div>
                      {puedeAnular && (
                        <button
                          type="button"
                          onClick={() => onAnular(it)}
                          className="mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-danger-bg hover:text-danger"
                          title="Anular saldo pendiente de este ítem"
                          aria-label="Anular saldo pendiente"
                        >
                          <Ban className="size-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {itemsSeleccionados.length > 0 && (
              <p className="text-right text-sm font-medium text-foreground">
                Total estimado: {formatCurrency(totalEstimado)}
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="compra-proveedor">Proveedor</Label>
          <Select id="compra-proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Selecciona un proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {p.nitCedula}
              </option>
            ))}
          </Select>
          <FieldHint>
            Una compra corresponde a un solo proveedor (así se genera la OC en PDF). Si el total por rubro supera el
            disponible del presupuesto, quedará pendiente de aprobación del Superadministrador.
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="compra-entrega">Fecha estimada de entrega</Label>
          <Input id="compra-entrega" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="compra-notas">Notas (opcional)</Label>
          <Textarea id="compra-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
