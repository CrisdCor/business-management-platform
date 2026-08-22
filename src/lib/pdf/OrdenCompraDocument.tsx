import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface OrdenCompraItemData {
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  observacion: string | null;
}

export interface OrdenCompraData {
  folioOc: string;
  fechaCompra: string;
  montoTotal: number;
  notas: string | null;
  fechaEntregaEstimada: string | null;
  requisicion: {
    folio: string;
    descripcion: string | null;
    areaNombre: string;
    ciudadOperacionNombre: string;
    solicitanteNombre: string;
  };
  proveedor: {
    nombre: string;
    nitCedula: string;
    banco: string;
    tipoCuenta: string;
    numeroCuenta: string;
  };
  items: OrdenCompraItemData[];
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#171717" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 16, fontWeight: 700 },
  folio: { fontSize: 12, fontWeight: 700, textAlign: "right" },
  meta: { fontSize: 9, color: "#737373", textAlign: "right", marginTop: 2 },
  section: { marginBottom: 16, borderTop: "1px solid #e5e5e5", paddingTop: 12 },
  sectionTitle: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#737373", marginBottom: 6, letterSpacing: 0.5 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 140, color: "#737373" },
  value: { flex: 1, fontWeight: 500 },
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1px solid #d4d4d4", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottom: "1px solid #f0f0f0" },
  colProducto: { flex: 3 },
  colCantidad: { flex: 1.2, textAlign: "right" },
  colPrecio: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },
  tableHeaderText: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#737373" },
  totalBox: { marginTop: 12, alignItems: "flex-end" },
  totalLabel: { fontSize: 9, color: "#737373" },
  totalValue: { fontSize: 18, fontWeight: 700, marginTop: 2 },
  footer: { marginTop: 40, fontSize: 8, color: "#a3a3a3", textAlign: "center" },
});

export function OrdenCompraDocument({ data }: { data: OrdenCompraData }) {
  return (
    <Document title={`Orden de compra ${data.folioOc}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Veloces</Text>
            <Text style={{ fontSize: 9, color: "#737373", marginTop: 2 }}>Orden de Compra</Text>
          </View>
          <View>
            <Text style={styles.folio}>{data.folioOc}</Text>
            <Text style={styles.meta}>Fecha: {formatDate(data.fechaCompra)}</Text>
            {data.fechaEntregaEstimada && (
              <Text style={styles.meta}>Entrega estimada: {formatDate(data.fechaEntregaEstimada)}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requisición de origen</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Folio</Text>
            <Text style={styles.value}>{data.requisicion.folio}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Área</Text>
            <Text style={styles.value}>{data.requisicion.areaNombre}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ciudad de operación</Text>
            <Text style={styles.value}>{data.requisicion.ciudadOperacionNombre}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Solicitante</Text>
            <Text style={styles.value}>{data.requisicion.solicitanteNombre}</Text>
          </View>
          {data.requisicion.descripcion && (
            <View style={styles.row}>
              <Text style={styles.label}>Descripción</Text>
              <Text style={styles.value}>{data.requisicion.descripcion}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proveedor</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{data.proveedor.nombre}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NIT / Cédula</Text>
            <Text style={styles.value}>{data.proveedor.nitCedula}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Banco</Text>
            <Text style={styles.value}>{data.proveedor.banco}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cuenta</Text>
            <Text style={styles.value}>
              {data.proveedor.tipoCuenta === "ahorros" ? "Ahorros" : "Corriente"} · {data.proveedor.numeroCuenta}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ítems</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colProducto, styles.tableHeaderText]}>Producto</Text>
              <Text style={[styles.colCantidad, styles.tableHeaderText]}>Cantidad</Text>
              <Text style={[styles.colPrecio, styles.tableHeaderText]}>Precio unitario</Text>
              <Text style={[styles.colSubtotal, styles.tableHeaderText]}>Subtotal</Text>
            </View>
            {data.items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <View style={styles.colProducto}>
                  <Text>{item.productoNombre}</Text>
                  {item.observacion && <Text style={{ fontSize: 8, color: "#a3a3a3" }}>{item.observacion}</Text>}
                </View>
                <Text style={styles.colCantidad}>
                  {item.cantidad} {item.unidadMedida}
                </Text>
                <Text style={styles.colPrecio}>{formatCurrency(item.precioUnitario)}</Text>
                <Text style={styles.colSubtotal}>{formatCurrency(item.cantidad * item.precioUnitario)}</Text>
              </View>
            ))}
          </View>
        </View>

        {data.notas && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text>{data.notas}</Text>
          </View>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Valor total de la compra</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.montoTotal)}</Text>
        </View>

        <Text style={styles.footer}>Documento generado por la plataforma de Gestión Administrativa de Veloces.</Text>
      </Page>
    </Document>
  );
}
