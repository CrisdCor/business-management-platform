"use client";

import * as React from "react";
import { Plus, Check, X as XIcon, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Select } from "@/components/ui/Select";
import { Input, Label, Textarea, FieldError } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui/Table";
import { BadgeEstadoRequisicion } from "@/components/compras/estado-badges";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { ESTADO_REQUISICION } from "@/domain/enums";
import {
  crearRequisicionAction,
  aprobarRequisicionAction,
  rechazarRequisicionAction,
} from "@/app/actions/requisiciones";
import type { RequisicionVM, OpcionCatalogo, PermisosRequisicionesVM } from "@/app/(dashboard)/compras/requisiciones/types";

export function RequisicionesView({
  requisicionesIniciales,
  areas,
  rubros,
  permisos,
}: {
  requisicionesIniciales: RequisicionVM[];
  areas: OpcionCatalogo[];
  rubros: OpcionCatalogo[];
  permisos: PermisosRequisicionesVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [filtroEstado, setFiltroEstado] = React.useState<string>("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [rechazar, setRechazar] = React.useState<RequisicionVM | null>(null);

  const filtradas = requisicionesIniciales.filter((r) => {
    const coincideBusqueda =
      !busqueda ||
      r.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = !filtroEstado || r.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  return (
    <div>
      <PageHeader
        title="Requisiciones"
        description="Solicitudes de compra de insumos, bodega y caja menor."
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
              <TableHead>Área / Rubro</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
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
                  <div className="text-xs text-muted-foreground">{r.rubroNombre}</div>
                </TableCell>
                <TableCell className="max-w-[240px] truncate">{r.descripcion}</TableCell>
                <TableCell>{formatCurrency(r.montoEstimado)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <BadgeEstadoRequisicion estado={r.estado} />
                    {r.plazoVencido && (
                      <Badge variant="danger">
                        <Clock className="size-3" /> plazo vencido
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{r.solicitanteNombre}</TableCell>
                <TableCell className="text-right">
                  {permisos.puedeAprobar && r.estado === ESTADO_REQUISICION.PENDIENTE && (
                    <div className="flex justify-end gap-1.5">
                      <AprobarBoton id={r.id} />
                      <Button variant="outline" size="sm" onClick={() => setRechazar(r)}>
                        <XIcon className="size-3.5" /> Rechazar
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalCrearRequisicion open={modalCrear} onClose={() => setModalCrear(false)} areas={areas} rubros={rubros} />
      <ModalRechazar requisicion={rechazar} onClose={() => setRechazar(null)} />
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
        placeholder="Explica brevemente por qué se rechaza..."
      />
    </SlideOver>
  );
}

function ModalCrearRequisicion({
  open,
  onClose,
  areas,
  rubros,
}: {
  open: boolean;
  onClose: () => void;
  areas: OpcionCatalogo[];
  rubros: OpcionCatalogo[];
}) {
  const [areaId, setAreaId] = React.useState("");
  const [rubroId, setRubroId] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [monto, setMonto] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  function limpiar() {
    setAreaId("");
    setRubroId("");
    setDescripcion("");
    setMonto("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNumero = Number(monto);
    if (!areaId || !rubroId) return setError("Selecciona el área y el rubro.");
    if (!descripcion.trim()) return setError("Describe qué necesitas comprar.");
    if (!montoNumero || montoNumero <= 0) return setError("Ingresa un monto estimado válido.");

    setCargando(true);
    const resultado = await crearRequisicionAction({
      areaId,
      rubroId,
      descripcion: descripcion.trim(),
      montoEstimado: montoNumero,
    });
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo crear la requisición.");

    notificar({ titulo: "Requisición creada", tono: "success" });
    limpiar();
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Nueva requisición"
      description="Se enviará a aprobación según tu rol."
      footer={
        <Button type="submit" form="form-requisicion" loading={cargando}>
          Crear requisición
        </Button>
      }
    >
      <form id="form-requisicion" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="req-area">Área</Label>
          <Select id="req-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Selecciona un área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="req-rubro">Rubro de compra</Label>
          <Select id="req-rubro" value={rubroId} onChange={(e) => setRubroId(e.target.value)}>
            <option value="">Selecciona un rubro</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="req-descripcion">Descripción</Label>
          <Textarea
            id="req-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="¿Qué insumos u elementos necesitas?"
          />
        </div>

        <div>
          <Label htmlFor="req-monto">Monto estimado (COP)</Label>
          <Input
            id="req-monto"
            type="number"
            min={0}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
          />
        </div>

        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
