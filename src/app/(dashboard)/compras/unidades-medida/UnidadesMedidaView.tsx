"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { crearUnidadMedidaAction, actualizarUnidadMedidaAction } from "@/app/actions/catalogos";

export interface UnidadMedidaVM {
  id: string;
  nombre: string;
  abreviatura: string | null;
  activo: boolean;
}

export interface PermisosUnidadesMedidaVM {
  puedeCrear: boolean;
  puedeActualizar: boolean;
}

export function UnidadesMedidaView({
  unidadesIniciales,
  permisos,
}: {
  unidadesIniciales: UnidadMedidaVM[];
  permisos: PermisosUnidadesMedidaVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<UnidadMedidaVM | null>(null);

  const filtradas = unidadesIniciales.filter((u) => !busqueda || u.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Unidades de medida"
        description="Unidades (unidad, caja, kg, litro...) que se asignan a cada producto del catálogo."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nueva unidad
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar unidad..." />

      {filtradas.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={3}>
                <EmptyState title="Sin unidades de medida" description="Crea unidades como unidad, caja, kg o litro." />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Nombre</TableHead>
              <TableHead>Abreviatura</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtradas.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{u.abreviatura ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.activo ? "success" : "neutral"}>{u.activo ? "Activa" : "Inactiva"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {permisos.puedeActualizar && (
                    <Button variant="outline" size="sm" onClick={() => setEditar(u)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalUnidadMedida open={modalCrear} onClose={() => setModalCrear(false)} />
      <ModalUnidadMedida unidad={editar} open={!!editar} onClose={() => setEditar(null)} />
    </div>
  );
}

function ModalUnidadMedida({
  open,
  onClose,
  unidad,
}: {
  open: boolean;
  onClose: () => void;
  unidad?: UnidadMedidaVM | null;
}) {
  const esEdicion = !!unidad;
  const [nombre, setNombre] = React.useState("");
  const [abreviatura, setAbreviatura] = React.useState("");
  const [activo, setActivo] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNombre(unidad?.nombre ?? "");
    setAbreviatura(unidad?.abreviatura ?? "");
    setActivo(unidad?.activo ?? true);
    setError(null);
  }, [unidad, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    setCargando(true);
    const resultado = esEdicion
      ? await actualizarUnidadMedidaAction(unidad!.id, { nombre, abreviatura: abreviatura || null, activo })
      : await crearUnidadMedidaAction(nombre, abreviatura || null);
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo guardar la unidad de medida.");

    notificar({ titulo: esEdicion ? "Unidad actualizada" : "Unidad creada", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar unidad de medida" : "Nueva unidad de medida"}
      width="sm"
      footer={
        <Button type="submit" form="form-unidad-medida" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-unidad-medida" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="unidad-nombre">Nombre</Label>
          <Input id="unidad-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Unidad, caja, kg, litro..." />
        </div>
        <div>
          <Label htmlFor="unidad-abreviatura">Abreviatura (opcional)</Label>
          <Input id="unidad-abreviatura" value={abreviatura} onChange={(e) => setAbreviatura(e.target.value)} placeholder="u, cja, kg, L..." />
        </div>
        {esEdicion && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 rounded border-input" />
            Unidad activa
          </label>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
