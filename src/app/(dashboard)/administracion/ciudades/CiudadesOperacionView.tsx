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
import { crearCiudadOperacionAction, actualizarCiudadOperacionAction } from "@/app/actions/catalogos";

export interface CiudadOperacionVM {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface PermisosCiudadesVM {
  puedeCrear: boolean;
  puedeActualizar: boolean;
}

export function CiudadesOperacionView({
  ciudadesIniciales,
  permisos,
}: {
  ciudadesIniciales: CiudadOperacionVM[];
  permisos: PermisosCiudadesVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<CiudadOperacionVM | null>(null);

  const filtradas = ciudadesIniciales.filter((c) => !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Ciudades de operación"
        description="Catálogo de ciudades donde opera la compañía, usado en el perfil de cada usuario."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nueva ciudad
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar ciudad..." />

      {filtradas.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={3}>
                <EmptyState title="Sin ciudades" description="Crea la primera ciudad de operación para poder asignarla a los usuarios." />
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
            {filtradas.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nombre}</TableCell>
                <TableCell>
                  <Badge variant={c.activo ? "success" : "neutral"}>{c.activo ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {permisos.puedeActualizar && (
                    <Button variant="outline" size="sm" onClick={() => setEditar(c)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalCiudad open={modalCrear} onClose={() => setModalCrear(false)} />
      <ModalCiudad ciudad={editar} open={!!editar} onClose={() => setEditar(null)} />
    </div>
  );
}

function ModalCiudad({ open, onClose, ciudad }: { open: boolean; onClose: () => void; ciudad?: CiudadOperacionVM | null }) {
  const esEdicion = !!ciudad;
  const [nombre, setNombre] = React.useState("");
  const [activo, setActivo] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // El formulario permanece montado durante la animación de salida del SlideOver;
    // se reinicia explícitamente al cambiar de registro/apertura en vez de usar `key`
    // (que rompería la animación al desmontar de inmediato).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNombre(ciudad?.nombre ?? "");
    setActivo(ciudad?.activo ?? true);
    setError(null);
  }, [ciudad, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    setCargando(true);
    const resultado = esEdicion
      ? await actualizarCiudadOperacionAction(ciudad!.id, { nombre, activo })
      : await crearCiudadOperacionAction(nombre);
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo guardar la ciudad de operación.");

    notificar({ titulo: esEdicion ? "Ciudad actualizada" : "Ciudad creada", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar ciudad de operación" : "Nueva ciudad de operación"}
      width="sm"
      footer={
        <Button type="submit" form="form-ciudad" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-ciudad" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="ciudad-nombre">Nombre</Label>
          <Input id="ciudad-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        {esEdicion && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 rounded border-input" />
            Ciudad activa
          </label>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
