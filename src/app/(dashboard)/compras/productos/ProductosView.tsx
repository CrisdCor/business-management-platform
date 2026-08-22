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
import { crearProductoAction, actualizarProductoAction } from "@/app/actions/catalogos";
import type { OpcionCatalogo } from "@/app/(dashboard)/compras/requisiciones/types";

export interface ProductoVM {
  id: string;
  nombre: string;
  rubroId: string;
  rubroNombre: string;
  unidadMedidaId: string;
  unidadMedidaNombre: string;
  activo: boolean;
}

export interface PermisosProductosVM {
  puedeCrear: boolean;
  puedeActualizar: boolean;
}

export function ProductosView({
  productosIniciales,
  rubros,
  unidadesMedida,
  permisos,
}: {
  productosIniciales: ProductoVM[];
  rubros: OpcionCatalogo[];
  unidadesMedida: OpcionCatalogo[];
  permisos: PermisosProductosVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<ProductoVM | null>(null);

  const filtrados = productosIniciales.filter((p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de productos solicitables en requisiciones: cada uno trae su rubro y unidad de medida ya configurados."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nuevo producto
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar producto..." />

      {filtrados.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={4}>
                <EmptyState
                  title="Sin productos"
                  description="Crea productos con su rubro y unidad de medida para que puedan solicitarse en requisiciones."
                />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Nombre</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>Unidad de medida</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtrados.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{p.rubroNombre}</TableCell>
                <TableCell className="text-muted-foreground">{p.unidadMedidaNombre}</TableCell>
                <TableCell>
                  <Badge variant={p.activo ? "success" : "neutral"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {permisos.puedeActualizar && (
                    <Button variant="outline" size="sm" onClick={() => setEditar(p)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModalProducto open={modalCrear} onClose={() => setModalCrear(false)} rubros={rubros} unidadesMedida={unidadesMedida} />
      <ModalProducto producto={editar} open={!!editar} onClose={() => setEditar(null)} rubros={rubros} unidadesMedida={unidadesMedida} />
    </div>
  );
}

function ModalProducto({
  open,
  onClose,
  producto,
  rubros,
  unidadesMedida,
}: {
  open: boolean;
  onClose: () => void;
  producto?: ProductoVM | null;
  rubros: OpcionCatalogo[];
  unidadesMedida: OpcionCatalogo[];
}) {
  const esEdicion = !!producto;
  const [nombre, setNombre] = React.useState("");
  const [rubroId, setRubroId] = React.useState("");
  const [unidadMedidaId, setUnidadMedidaId] = React.useState("");
  const [activo, setActivo] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNombre(producto?.nombre ?? "");
    setRubroId(producto?.rubroId ?? "");
    setUnidadMedidaId(producto?.unidadMedidaId ?? "");
    setActivo(producto?.activo ?? true);
    setError(null);
  }, [producto, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (!rubroId) return setError("Selecciona el rubro.");
    if (!unidadMedidaId) return setError("Selecciona la unidad de medida.");

    setCargando(true);
    const resultado = esEdicion
      ? await actualizarProductoAction(producto!.id, { nombre, rubroId, unidadMedidaId, activo })
      : await crearProductoAction({ nombre, rubroId, unidadMedidaId });
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo guardar el producto.");

    notificar({ titulo: esEdicion ? "Producto actualizado" : "Producto creado", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar producto" : "Nuevo producto"}
      width="sm"
      footer={
        <Button type="submit" form="form-producto" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-producto" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="producto-nombre">Nombre</Label>
          <Input id="producto-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="producto-rubro">Rubro</Label>
          <Select id="producto-rubro" value={rubroId} onChange={(e) => setRubroId(e.target.value)}>
            <option value="">Selecciona un rubro</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="producto-unidad">Unidad de medida</Label>
          <Select id="producto-unidad" value={unidadMedidaId} onChange={(e) => setUnidadMedidaId(e.target.value)}>
            <option value="">Selecciona una unidad</option>
            {unidadesMedida.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
        </div>
        {esEdicion && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 rounded border-input" />
            Producto activo
          </label>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
