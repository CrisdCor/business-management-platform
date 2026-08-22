import { cn } from "@/lib/utils";

type Tono = "success" | "warning" | "danger" | "info" | "neutral";

const TONOS: Record<Tono, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

/** Punto de estado discreto (Ready/Error de un dashboard tipo Vercel), con un pulso sutil para estados activos. */
export function StatusDot({ tono, pulse = false }: { tono: Tono; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2">
      {pulse && (
        <span
          className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", TONOS[tono])}
        />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", TONOS[tono])} />
    </span>
  );
}
