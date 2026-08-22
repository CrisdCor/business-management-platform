import { Badge, type BadgeProps } from "@/components/ui/Badge";
import {
  ESTADO_REQUISICION_LABELS,
  ESTADO_COMPRA_LABELS,
  type EstadoRequisicion,
  type EstadoCompra,
} from "@/domain/enums";

const VARIANTE_REQUISICION: Record<EstadoRequisicion, NonNullable<BadgeProps["variant"]>> = {
  pendiente: "warning",
  aprobada: "info",
  rechazada: "danger",
  en_compra: "info",
  cerrada: "success",
};

export function BadgeEstadoRequisicion({ estado }: { estado: EstadoRequisicion }) {
  return <Badge variant={VARIANTE_REQUISICION[estado]}>{ESTADO_REQUISICION_LABELS[estado]}</Badge>;
}

const VARIANTE_COMPRA: Record<EstadoCompra, NonNullable<BadgeProps["variant"]>> = {
  pendiente_aprobacion_exceso: "warning",
  en_proceso: "info",
  enviada: "info",
  cerrada: "success",
  vencida: "danger",
};

export function BadgeEstadoCompra({ estado }: { estado: EstadoCompra }) {
  return <Badge variant={VARIANTE_COMPRA[estado]}>{ESTADO_COMPRA_LABELS[estado]}</Badge>;
}
