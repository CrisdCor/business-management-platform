"use client";

import * as React from "react";
import { Plus, FileDown, ShieldCheck, Truck, CheckCheck, Eye } from "lucide-react";
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
import type {
  CompraVM,
  RequisicionDisponibleVM,
  ProveedorOpcionVM,
  PermisosOrdenesVM,
} from "@/app/(dashboard)/compras/ordenes/types";

export function OrdenesView({
  comprasIniciales,
  requisicionesDisponibles,
  proveedores,
  permisos,
}: {
  comprasIniciales: CompraVM[];
  requisicionesDisponibles: RequisicionDisponibleVM[];
  proveedores: ProveedorOpcionVM[];
  permisos: PermisosOrdenesVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalRegistrar, setModalRegistrar] = React.useState(false);
  const [verItems, setVerItems] = React.useState<CompraVM | null>(null);
  const { notificar } = useToast();

  const filtradas = comprasIniciales.filter(
    (c) =>
      !busqueda ||
      c.folioOc.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.requisicionFolio.toLowerCase().includes(busqueda.toLowerCase()),
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
        description="Gestión de compras a partir de los ítems de requisiciones aprobadas."
        action={
          permisos.puedeRegistrar &&
          requisicionesDisponibles.length > 0 && (
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
                <EmptyState title="No hay compras registradas" description="Registra una compra a partir de los ítems pendientes de una requisición aprobada." />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>OC</TableHead>
              <TableHead>Requisición</TableHead>
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
                  <div className="font-mono text-xs text-foreground">{c.requisicionFolio}</div>
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
        requisiciones={requisicionesDisponibles}
        proveedores={proveedores}
      />
      <ModalVerItemsCompra compra={verItems} onClose={() => setVerItems(null)} />
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
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio unitario</TableHead>
              <TableHead>Subtotal</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {compra.items.map((it) => (
              <TableRow key={it.id}>
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

interface SeleccionItem {
  itemId: string;
  seleccionado: boolean;
  precioUnitario: string;
}

function ModalRegistrarCompra({
  open,
  onClose,
  requisiciones,
  proveedores,
}: {
  open: boolean;
  onClose: () => void;
  requisiciones: RequisicionDisponibleVM[];
  proveedores: ProveedorOpcionVM[];
}) {
  const [requisicionId, setRequisicionId] = React.useState("");
  const [proveedorId, setProveedorId] = React.useState("");
  const [seleccion, setSeleccion] = React.useState<SeleccionItem[]>([]);
  const [fechaEntrega, setFechaEntrega] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  const requisicionSeleccionada = requisiciones.find((r) => r.id === requisicionId);

  React.useEffect(() => {
    // Reinicia la selección de ítems al cambiar de requisición (el formulario
    // permanece montado durante la animación de salida del SlideOver).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeleccion(
      (requisicionSeleccionada?.itemsPendientes ?? []).map((it) => ({
        itemId: it.id,
        seleccionado: false,
        precioUnitario: "",
      })),
    );
  }, [requisicionSeleccionada]);

  function limpiar() {
    setRequisicionId("");
    setProveedorId("");
    setSeleccion([]);
    setFechaEntrega("");
    setNotas("");
    setError(null);
  }

  function actualizarSeleccion(itemId: string, cambios: Partial<SeleccionItem>) {
    setSeleccion((prev) => prev.map((s) => (s.itemId === itemId ? { ...s, ...cambios } : s)));
  }

  const itemsSeleccionados = seleccion.filter((s) => s.seleccionado);
  const totalEstimado = itemsSeleccionados.reduce((acc, s) => {
    const item = requisicionSeleccionada?.itemsPendientes.find((it) => it.id === s.itemId);
    const precio = Number(s.precioUnitario) || 0;
    return acc + (item ? item.cantidad * precio : 0);
  }, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!requisicionId || !proveedorId) return setError("Selecciona la requisición y el proveedor.");
    if (itemsSeleccionados.length === 0) return setError("Selecciona al menos un ítem a comprar.");
    for (const s of itemsSeleccionados) {
      const precio = Number(s.precioUnitario);
      if (!precio || precio <= 0) return setError("Ingresa el precio unitario de cada ítem seleccionado.");
    }

    setCargando(true);
    const resultado = await registrarCompraAction({
      requisicionId,
      proveedorId,
      items: itemsSeleccionados.map((s) => ({
        requisicionItemId: s.itemId,
        precioUnitario: Number(s.precioUnitario),
      })),
      fechaEntregaEstimada: fechaEntrega ? new Date(fechaEntrega).toISOString() : null,
      notas: notas.trim() || null,
    });
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo registrar la compra.");

    notificar({ titulo: "Compra registrada", tono: "success" });
    limpiar();
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Registrar compra"
      description="Selecciona los ítems que se negociaron y su precio; se genera la Orden de Compra (OC)."
      width="lg"
      footer={
        <Button type="submit" form="form-compra" loading={cargando}>
          Registrar compra
        </Button>
      }
    >
      <form id="form-compra" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="compra-requisicion">Requisición aprobada</Label>
          <Select
            id="compra-requisicion"
            value={requisicionId}
            onChange={(e) => {
              setRequisicionId(e.target.value);
              setProveedorId("");
            }}
          >
            <option value="">Selecciona una requisición</option>
            {requisiciones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.folio} · {r.areaNombre} · {r.itemsPendientes.length} ítem(s) pendiente(s)
              </option>
            ))}
          </Select>
          {requisicionSeleccionada?.descripcion && <FieldHint>{requisicionSeleccionada.descripcion}</FieldHint>}
        </div>

        {requisicionSeleccionada && (
          <div className="flex flex-col gap-2">
            <Label>Ítems pendientes</Label>
            <div className="flex flex-col gap-2">
              {requisicionSeleccionada.itemsPendientes.map((it) => {
                const sel = seleccion.find((s) => s.itemId === it.id);
                return (
                  <div key={it.id} className="flex items-start gap-2 rounded-md border border-border p-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-input"
                      checked={sel?.seleccionado ?? false}
                      onChange={(e) => actualizarSeleccion(it.id, { seleccionado: e.target.checked })}
                    />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-foreground">{it.productoNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.cantidad} {it.unidadMedidaAbreviatura ?? it.unidadMedidaNombre} · {it.rubroNombre}
                        {it.observacion ? ` · ${it.observacion}` : ""}
                      </p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Precio unitario"
                        disabled={!sel?.seleccionado}
                        value={sel?.precioUnitario ?? ""}
                        onChange={(e) => actualizarSeleccion(it.id, { precioUnitario: e.target.value })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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
          <FieldHint>Si el total por rubro supera el disponible del presupuesto, quedará pendiente de aprobación del Superadministrador.</FieldHint>
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
