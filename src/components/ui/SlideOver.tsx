"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Ancho del panel. "md" ronda el 40% de pantalla pedido, con mínimos/máximos legibles. */
  width?: "sm" | "md" | "lg";
}

const ANCHOS: Record<NonNullable<SlideOverProps["width"]>, string> = {
  sm: "sm:w-[32vw] sm:min-w-[380px] sm:max-w-[480px]",
  md: "sm:w-[40vw] sm:min-w-[460px] sm:max-w-[640px]",
  lg: "sm:w-[48vw] sm:min-w-[560px] sm:max-w-[820px]",
};

const DURACION_SALIDA_MS = 200;

/**
 * Modal flotante que se desliza desde la derecha del área principal, único
 * patrón de creación/edición de la aplicación (evita navegaciones extra).
 * Se monta vía portal para quedar por encima de cualquier layout, bloquea el
 * scroll del fondo mientras está abierto y anima entrada/salida con
 * transiciones suaves de opacidad + desplazamiento.
 */
export function SlideOver({ open, onClose, title, description, children, footer, width = "md" }: SlideOverProps) {
  const [renderizado, setRenderizado] = React.useState(open);
  const [saliendo, setSaliendo] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // Patrón documentado de React para animar la salida de un componente: se
      // mantiene montado y se controla su estado de transición desde un efecto
      // ligado a la prop `open` (no puede resolverse con `key`, que desmontaría
      // el contenido de inmediato en vez de dejarlo animar).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRenderizado(true);
      setSaliendo(false);
      return;
    }
    if (renderizado) {
      setSaliendo(true);
      const t = setTimeout(() => {
        setRenderizado(false);
        setSaliendo(false);
      }, DURACION_SALIDA_MS);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!renderizado) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [renderizado, onClose]);

  if (!renderizado || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-[2px]",
          saliendo ? "animate-fade-out" : "animate-fade-in",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
        className={cn(
          "relative flex h-full w-full flex-col bg-surface shadow-overlay",
          "sm:rounded-l-xl sm:border-l sm:border-border",
          ANCHOS[width],
          saliendo ? "animate-slide-out" : "animate-slide-in",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 id="slide-over-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
