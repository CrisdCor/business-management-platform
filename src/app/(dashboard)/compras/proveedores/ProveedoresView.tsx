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
import { crearProveedorAction, actualizarProveedorAction } from "@/app/actions/catalogos";
import type { ProveedorVM, PermisosProveedoresVM } from "@/app/(dashboard)/compras/proveedores/types";
import type { TipoCuentaBancaria } from "@/domain/enums";

export function ProveedoresView({
  proveedoresIniciales,
  permisos,
}: {
  proveedoresIniciales: ProveedorVM[];
  permisos: PermisosProveedoresVM;
}) {
  const [busqueda, setBusqueda] = React.useState("");
  const [modalCrear, setModalCrear] = React.useState(false);
  const [editar, setEditar] = React.useState<ProveedorVM | null>(null);

  const filtrados = proveedoresIniciales.filter(
    (p) =>
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.nitCedula.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Datos de pago de los proveedores para la generación de OC."
        action={
          permisos.puedeCrear && (
            <Button onClick={() => setModalCrear(true)}>
              <Plus className="size-4" /> Nuevo proveedor
            </Button>
          )
        }
      />

      <FilterBar busqueda={busqueda} onBusquedaChange={setBusqueda} placeholder="Buscar por nombre o NIT..." />

      {filtrados.length === 0 ? (
        <Table>
          <TableBody>
            <tr>
              <td colSpan={5}>
                <EmptyState title="Sin proveedores" description="Crea el primer proveedor para poder registrar compras." />
              </td>
            </tr>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>NIT / Cédula</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Datos de pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtrados.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.nitCedula}</TableCell>
                <TableCell>{p.nombre}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.banco} · {p.tipoCuenta} · {p.numeroCuenta}
                </TableCell>
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

      <ModalProveedor open={modalCrear} onClose={() => setModalCrear(false)} />
      <ModalProveedor proveedor={editar} open={!!editar} onClose={() => setEditar(null)} />
    </div>
  );
}

function ModalProveedor({
  open,
  onClose,
  proveedor,
}: {
  open: boolean;
  onClose: () => void;
  proveedor?: ProveedorVM | null;
}) {
  const esEdicion = !!proveedor;
  const [nitCedula, setNitCedula] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [banco, setBanco] = React.useState("");
  const [tipoCuenta, setTipoCuenta] = React.useState<TipoCuentaBancaria>("ahorros");
  const [numeroCuenta, setNumeroCuenta] = React.useState("");
  const [activo, setActivo] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  React.useEffect(() => {
    if (proveedor) {
      setNitCedula(proveedor.nitCedula);
      setNombre(proveedor.nombre);
      setBanco(proveedor.banco);
      setTipoCuenta(proveedor.tipoCuenta);
      setNumeroCuenta(proveedor.numeroCuenta);
      setActivo(proveedor.activo);
    } else {
      setNitCedula("");
      setNombre("");
      setBanco("");
      setTipoCuenta("ahorros");
      setNumeroCuenta("");
      setActivo(true);
    }
    setError(null);
  }, [proveedor, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nitCedula.trim() || !nombre.trim() || !banco.trim() || !numeroCuenta.trim()) {
      return setError("Completa todos los campos.");
    }

    setCargando(true);
    const resultado = esEdicion
      ? await actualizarProveedorAction(proveedor!.id, { nombre, banco, tipoCuenta, numeroCuenta, activo })
      : await crearProveedorAction({ nitCedula, nombre, banco, tipoCuenta, numeroCuenta });
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo guardar el proveedor.");

    notificar({ titulo: esEdicion ? "Proveedor actualizado" : "Proveedor creado", tono: "success" });
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={esEdicion ? "Editar proveedor" : "Nuevo proveedor"}
      width="sm"
      footer={
        <Button type="submit" form="form-proveedor" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-proveedor" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="prov-nit">NIT / Cédula</Label>
          <Input id="prov-nit" value={nitCedula} onChange={(e) => setNitCedula(e.target.value)} disabled={esEdicion} />
        </div>
        <div>
          <Label htmlFor="prov-nombre">Nombre</Label>
          <Input id="prov-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="prov-banco">Banco</Label>
          <Input id="prov-banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="prov-tipo">Tipo de cuenta</Label>
          <Select id="prov-tipo" value={tipoCuenta} onChange={(e) => setTipoCuenta(e.target.value as TipoCuentaBancaria)}>
            <option value="ahorros">Ahorros</option>
            <option value="corriente">Corriente</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="prov-cuenta">Número de cuenta</Label>
          <Input id="prov-cuenta" value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} />
        </div>
        {esEdicion && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 rounded border-input" />
            Proveedor activo
          </label>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
