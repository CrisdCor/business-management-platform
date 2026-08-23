import { NextResponse, type NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CompraService } from "@/services/CompraService";
import { RequisicionService } from "@/services/RequisicionService";
import { ProveedorRepository } from "@/repositories/ProveedorRepository";
import { OrdenCompraDocument } from "@/lib/pdf/OrdenCompraDocument";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const compra = await new CompraService(supabase).obtener(id);
  if (!compra) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });

  const requisicionIds = Array.from(new Set(compra.items.map((it) => it.requisicion_id).filter((v): v is string => !!v)));
  const requisicionSvc = new RequisicionService(supabase);

  const [requisiciones, proveedor] = await Promise.all([
    Promise.all(requisicionIds.map((reqId) => requisicionSvc.obtener(reqId))),
    new ProveedorRepository(supabase).findById(compra.proveedorId),
  ]);

  const requisicionesEncontradas = requisiciones.filter((r): r is NonNullable<typeof r> => r !== null);
  if (requisicionesEncontradas.length === 0 || !proveedor) {
    return NextResponse.json({ error: "Datos incompletos para generar la OC" }, { status: 404 });
  }

  // Todos los ítems de una compra comparten área/ciudad de operación por
  // construcción (lo valida `registrar_compra_oc`) -- se toma de la primera.
  const [primera] = requisicionesEncontradas;

  const stream = await renderToStream(
    OrdenCompraDocument({
      data: {
        folioOc: compra.folioOc,
        fechaCompra: compra.fechaCompra.toISOString(),
        montoTotal: compra.montoTotal,
        notas: compra.notas,
        fechaEntregaEstimada: compra.fechaEntregaEstimada?.toISOString() ?? null,
        areaNombre: primera.areaNombre ?? "—",
        ciudadOperacionNombre: primera.ciudadOperacionNombre ?? "—",
        requisiciones: requisicionesEncontradas.map((r) => ({
          folio: r.folio,
          descripcion: r.descripcion,
          solicitanteNombre: r.solicitanteNombre ?? "—",
        })),
        proveedor: {
          nombre: proveedor.nombre,
          nitCedula: proveedor.nitCedula,
          banco: proveedor.banco,
          tipoCuenta: proveedor.tipoCuenta,
          numeroCuenta: proveedor.numeroCuenta,
        },
        items: compra.items.map((it) => ({
          requisicionFolio: it.requisicion_folio ?? "—",
          productoNombre: it.producto_nombre ?? "—",
          cantidad: it.cantidad,
          unidadMedida: it.unidad_medida_abreviatura ?? it.unidad_medida_nombre ?? "",
          precioUnitario: it.precio_unitario,
          observacion: it.observacion ?? null,
        })),
      },
    }),
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${compra.folioOc}.pdf"`,
    },
  });
}
