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
import { crearAreaAction, actualizarAreaAction } from "@/app/actions/catalogos";

export interface AreaVM {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface PermisosAreasVM {
  puedeCrear: boolean;
  puedeActualizar: boolean;
}

export function AreasView({ areasIniciales, permisos }: { areasIniciales: AreaVM[]; permisos: PermisosAreasVM }) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<AreaVM | null>(null);

  const filtradas = areasIniciales.filter((a) => !busqueda || a.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Áreas"
        description="Catálogo de áreas de la compañía usado en usuarios, requisiciones y presupuestos."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nueva área
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar área..." />

      {filtradas.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={3}>
                <EmptyState title="Sin áreas" description="Crea la primera área para poder asignar usuarios y presupuestos." />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtradas.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.nombre}</TableCell>
                <TableCell>
                  <Badge variant={a.activo ? "success" : "neutral"}>{a.activo ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {permisos.puedeActualizar && (
                    <Button variant="outline" size="sm" onClick={() => setEditar(a)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalArea open={modalCrear} onClose={() => setModalCrear(false)} />
      <ModalArea area={editar} open={!!editar} onClose={() => setEditar(null)} />
    </div>
  );
}

function ModalArea({ open, onClose, area }: { open: boolean; onClose: () => void; area?: AreaVM | null }) {
  const esEdicion = !!area;
  const [nombre, setNombre] = React.useState("");
  const [activo, setActivo] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    setNombre(area?.nombre ?? "");
    setActivo(area?.activo ?? true);
    setError(null);
  }, [area, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    setCargando(true);
    const resultado = esEdicion
      ? await actualizarAreaAction(area!.id, { nombre, activo })
      : await crearAreaAction(nombre);
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo guardar el área.");

    notificar({ titulo: esEdicion ? "Área actualizada" : "Área creada", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar área" : "Nueva área"}
      width="sm"
      footer={
        <Button type="submit" form="form-area" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-area" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="area-nombre">Nombre</Label>
          <Input id="area-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        {esEdicion && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 rounded border-input" />
            Área activa
          </label>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
