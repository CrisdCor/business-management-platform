"use client";

import * as React from "react";
import { Plus, FileDown, ShieldCheck, Truck, CheckCheck } from "lucide-react";
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
        description="Gestión de compras a partir de requisiciones aprobadas."
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
                <EmptyState title="No hay compras registradas" description="Registra una compra a partir de una requisición aprobada." />
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
              <TableHead>Monto</TableHead>
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
                  <div className="max-w-[200px] truncate text-xs text-muted-foreground">{c.requisicionDescripcion}</div>
                </TableCell>
                <TableCell>{c.proveedorNombre}</TableCell>
                <TableCell>
                  {formatCurrency(c.monto)}
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
    </div>
  );
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
  const [monto, setMonto] = React.useState("");
  const [fechaEntrega, setFechaEntrega] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  const requisicionSeleccionada = requisiciones.find((r) => r.id === requisicionId);

  function limpiar() {
    setRequisicionId("");
    setProveedorId("");
    setMonto("");
    setFechaEntrega("");
    setNotas("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNumero = Number(monto);
    if (!requisicionId || !proveedorId) return setError("Selecciona la requisición y el proveedor.");
    if (!montoNumero || montoNumero <= 0) return setError("Ingresa el monto real de la compra.");

    setCargando(true);
    const resultado = await registrarCompraAction({
      requisicionId,
      proveedorId,
      monto: montoNumero,
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
      description="Genera la orden de compra (OC) a partir de una requisición aprobada."
      footer={
        <Button type="submit" form="form-compra" loading={cargando}>
          Registrar compra
        </Button>
      }
    >
      <form id="form-compra" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="compra-requisicion">Requisición aprobada</Label>
          <Select id="compra-requisicion" value={requisicionId} onChange={(e) => setRequisicionId(e.target.value)}>
            <option value="">Selecciona una requisición</option>
            {requisiciones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.folio} · {r.areaNombre} · {formatCurrency(r.montoEstimado)}
              </option>
            ))}
          </Select>
          {requisicionSeleccionada && (
            <FieldHint>{requisicionSeleccionada.descripcion}</FieldHint>
          )}
        </div>

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
        </div>

        <div>
          <Label htmlFor="compra-monto">Monto de la compra (COP)</Label>
          <Input id="compra-monto" type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
          <FieldHint>Si supera el disponible del presupuesto, quedará pendiente de aprobación del Superadministrador.</FieldHint>
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
