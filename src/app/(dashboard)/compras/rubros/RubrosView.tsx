"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Input, Label, Textarea, FieldError } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { crearRubroAction, actualizarRubroAction } from "@/app/actions/catalogos";

export interface RubroVM {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface PermisosRubrosVM {
  puedeCrear: boolean;
  puedeActualizar: boolean;
}

export function RubrosView({ rubrosIniciales, permisos }: { rubrosIniciales: RubroVM[]; permisos: PermisosRubrosVM }) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<RubroVM | null>(null);

  const filtrados = rubrosIniciales.filter((r) => !busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Rubros de compra"
        description="Categorías bajo las que se asigna presupuesto y se crean requisiciones."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nuevo rubro
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar rubro..." />

      {filtrados.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={3}>
                <EmptyState title="Sin rubros" description="Crea rubros como insumos de bodega, insumos de oficina o caja menor." />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtrados.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.nombre}</TableCell>
                <TableCell className="max-w-[320px] truncate text-muted-foreground">{r.descripcion ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.activo ? "success" : "neutral"}>{r.activo ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {permisos.puedeActualizar && (
                    <Button variant="outline" size="sm" onClick={() => setEditar(r)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalRubro open={modalCrear} onClose={() => setModalCrear(false)} />
      <ModalRubro rubro={editar} open={!!editar} onClose={() => setEditar(null)} />
    </div>
  );
}

function ModalRubro({ open, onClose, rubro }: { open: boolean; onClose: () => void; rubro?: RubroVM | null }) {
  const esEdicion = !!rubro;
  const [nombre, setNombre] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [activo, setActivo] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    setNombre(rubro?.nombre ?? "");
    setDescripcion(rubro?.descripcion ?? "");
    setActivo(rubro?.activo ?? true);
    setError(null);
  }, [rubro, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    setCargando(true);
    const resultado = esEdicion
      ? await actualizarRubroAction(rubro!.id, { nombre, descripcion: descripcion || null, activo })
      : await crearRubroAction(nombre, descripcion || null);
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo guardar el rubro.");

    notificar({ titulo: esEdicion ? "Rubro actualizado" : "Rubro creado", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar rubro" : "Nuevo rubro"}
      width="sm"
      footer={
        <Button type="submit" form="form-rubro" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-rubro" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="rubro-nombre">Nombre</Label>
          <Input id="rubro-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rubro-descripcion">Descripción (opcional)</Label>
          <Textarea id="rubro-descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        {esEdicion && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 rounded border-input" />
            Rubro activo
          </label>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
