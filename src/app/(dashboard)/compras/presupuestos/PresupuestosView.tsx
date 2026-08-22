"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Select } from "@/components/ui/Select";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { cn, formatCurrency } from "@/lib/utils";
import { asignarPresupuestoAction, ajustarPresupuestoAction } from "@/app/actions/presupuestos";
import type { PresupuestoVM, OpcionCatalogo, PermisosPresupuestosVM } from "@/app/(dashboard)/compras/presupuestos/types";

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function PresupuestosView({
  presupuestosIniciales,
  areas,
  rubros,
  permisos,
  anio,
  mes,
}: {
  presupuestosIniciales: PresupuestoVM[];
  areas: OpcionCatalogo[];
  rubros: OpcionCatalogo[];
  permisos: PermisosPresupuestosVM;
  anio: number;
  mes: number;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalAsignar, setModalAsignar] = React.useState(false);
  const [editar, setEditar] = React.useState<PresupuestoVM | null>(null);

  const filtrados = presupuestosIniciales.filter(
    (p) =>
      !busqueda ||
      p.rubroNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.areaNombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description={`Asignación mensual por rubro y área — ${NOMBRES_MES[mes - 1]} ${anio}.`}
        action={
          permisos.puedeAsignar && (
            <Button onClick={() => setModalAsignar(true)}>
              <Plus className="size-4" /> Asignar presupuesto
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar por rubro o área..." />

      {filtrados.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={5}>
                <EmptyState title="Sin presupuestos este mes" description="Asigna un presupuesto por rubro y área para habilitar requisiciones." />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Rubro</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Asignado</TableHead>
              <TableHead>Consumo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtrados.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.rubroNombre}</TableCell>
                <TableCell>{p.areaNombre}</TableCell>
                <TableCell>{formatCurrency(p.montoAsignado)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-500",
                          p.nivelAlerta === "excedido" && "bg-danger",
                          p.nivelAlerta === "alerta" && "bg-warning",
                          p.nivelAlerta === "normal" && "bg-success",
                        )}
                        style={{ width: `${Math.min(p.porcentajeConsumido, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{p.porcentajeConsumido}%</span>
                    {p.nivelAlerta !== "normal" && (
                      <Badge variant={p.nivelAlerta === "excedido" ? "danger" : "warning"}>
                        {p.nivelAlerta === "excedido" ? "excedido" : "alerta"}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {permisos.puedeAjustar && (
                    <Button variant="outline" size="sm" onClick={() => setEditar(p)}>
                      <Pencil className="size-3.5" /> Ajustar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalAsignar open={modalAsignar} onClose={() => setModalAsignar(false)} areas={areas} rubros={rubros} anio={anio} mes={mes} />
      <ModalAjustar presupuesto={editar} onClose={() => setEditar(null)} />
    </div>
  );
}

function ModalAsignar({
  open,
  onClose,
  areas,
  rubros,
  anio,
  mes,
}: {
  open: boolean;
  onClose: () => void;
  areas: OpcionCatalogo[];
  rubros: OpcionCatalogo[];
  anio: number;
  mes: number;
}) {
  const [areaId, setAreaId] = React.useState("");
  const [rubroId, setRubroId] = React.useState("");
  const [monto, setMonto] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNumero = Number(monto);
    if (!areaId || !rubroId) return setError("Selecciona área y rubro.");
    if (!montoNumero || montoNumero <= 0) return setError("Ingresa un monto válido.");

    setCargando(true);
    const resultado = await asignarPresupuestoAction({ areaId, rubroId, anio, mes, montoAsignado: montoNumero });
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo asignar el presupuesto.");

    notificar({ titulo: "Presupuesto asignado", tono: "success" });
    setAreaId("");
    setRubroId("");
    setMonto("");
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Asignar presupuesto"
      description="Define el monto disponible para un rubro y área en el mes actual."
      footer={
        <Button type="submit" form="form-presupuesto" loading={cargando}>
          Asignar
        </Button>
      }
    >
      <form id="form-presupuesto" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="pres-area">Área</Label>
          <Select id="pres-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Selecciona un área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pres-rubro">Rubro</Label>
          <Select id="pres-rubro" value={rubroId} onChange={(e) => setRubroId(e.target.value)}>
            <option value="">Selecciona un rubro</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pres-monto">Monto asignado (COP)</Label>
          <Input id="pres-monto" type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}

function ModalAjustar({ presupuesto, onClose }: { presupuesto: PresupuestoVM | null; onClose: () => void }) {
  const [monto, setMonto] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    if (presupuesto) setMonto(String(presupuesto.montoAsignado));
  }, [presupuesto]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!presupuesto) return;
    setError(null);
    const montoNumero = Number(monto);
    if (!montoNumero || montoNumero < 0) return setError("Ingresa un monto válido.");

    setCargando(true);
    const resultado = await ajustarPresupuestoAction(presupuesto.id, montoNumero);
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo ajustar.");

    notificar({ titulo: "Presupuesto ajustado", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={!!presupuesto}
      onClose={onClose}
      title={`Ajustar presupuesto`}
      description={presupuesto ? `${presupuesto.rubroNombre} · ${presupuesto.areaNombre}` : undefined}
      width="sm"
      footer={
        <Button type="submit" form="form-ajuste" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-ajuste" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="ajuste-monto">Monto asignado (COP)</Label>
          <Input id="ajuste-monto" type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        {presupuesto && (
          <p className="text-xs text-muted-foreground">
            Consumido a la fecha: {formatCurrency(presupuesto.montoConsumido)}
          </p>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
