import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/services/AuthService";
import { RequisicionService } from "@/services/RequisicionService";
import { CompraService } from "@/services/CompraService";
import { PresupuestoService } from "@/services/PresupuestoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MODULOS, ESTADO_REQUISICION, ESTADO_COMPRA } from "@/domain/enums";
import { formatCurrency } from "@/lib/utils";

export default async function PanelPage() {
  const supabase = await createClient();
  const auth = new AuthService(supabase);
  const usuario = await auth.usuarioActual();
  if (!usuario) return null;

  const puedeVerRequisiciones = usuario.permisos.puedeLeer(MODULOS.COMPRAS_REQUISICIONES);
  const puedeVerCompras = usuario.permisos.puedeLeer(MODULOS.COMPRAS_COMPRAS);
  const puedeVerPresupuestos = usuario.permisos.puedeLeer(MODULOS.COMPRAS_PRESUPUESTOS);

  const [requisicionesPendientes, comprasEnProceso, presupuestos] = await Promise.all([
    puedeVerRequisiciones
      ? new RequisicionService(supabase).listar({ estado: ESTADO_REQUISICION.PENDIENTE })
      : Promise.resolve([]),
    puedeVerCompras
      ? new CompraService(supabase).listar({ estado: ESTADO_COMPRA.EN_PROCESO })
      : Promise.resolve([]),
    puedeVerPresupuestos
      ? new PresupuestoService(supabase).listarPorPeriodo(new Date().getFullYear(), new Date().getMonth() + 1)
      : Promise.resolve([]),
  ]);

  const totalAsignado = presupuestos.reduce((acc, p) => acc + p.montoAsignado, 0);
  const totalConsumido = presupuestos.reduce((acc, p) => acc + p.montoConsumido, 0);
  const enAlerta = presupuestos.filter((p) => p.nivelAlerta !== "normal");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Hola, {usuario.nombre.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Este es el resumen de gestión administrativa de hoy.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {puedeVerRequisiciones && (
          <Card>
            <CardHeader>
              <CardTitle>Requisiciones pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{requisicionesPendientes.length}</p>
              <Link href="/compras/requisiciones" className="mt-2 inline-block text-[13px] text-foreground underline-offset-4 hover:underline">
                Revisar requisiciones →
              </Link>
            </CardContent>
          </Card>
        )}

        {puedeVerCompras && (
          <Card>
            <CardHeader>
              <CardTitle>Compras en proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{comprasEnProceso.length}</p>
              <Link href="/compras/ordenes" className="mt-2 inline-block text-[13px] text-foreground underline-offset-4 hover:underline">
                Ver órdenes de compra →
              </Link>
            </CardContent>
          </Card>
        )}

        {puedeVerPresupuestos && (
          <Card>
            <CardHeader>
              <CardTitle>Presupuesto del mes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">
                {totalAsignado > 0 ? Math.round((totalConsumido / totalAsignado) * 100) : 0}%
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {formatCurrency(totalConsumido)} de {formatCurrency(totalAsignado)}
              </p>
              {enAlerta.length > 0 && (
                <Badge variant="warning" className="mt-2">
                  {enAlerta.length} rubro(s) en alerta
                </Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!puedeVerRequisiciones && !puedeVerCompras && !puedeVerPresupuestos && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no tienes módulos asignados. Pide al Superadministrador que configure tus permisos.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
