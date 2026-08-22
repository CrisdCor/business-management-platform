"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTono = "success" | "danger" | "info";

interface Toast {
  id: number;
  titulo: string;
  descripcion?: string;
  tono: ToastTono;
}

interface ToastContextValue {
  notificar: (input: { titulo: string; descripcion?: string; tono?: ToastTono }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const ICONOS: Record<ToastTono, React.ReactNode> = {
  success: <CheckCircle2 className="size-4.5 text-success" />,
  danger: <XCircle className="size-4.5 text-danger" />,
  info: <Info className="size-4.5 text-info" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const notificar = React.useCallback<ToastContextValue["notificar"]>(({ titulo, descripcion, tono = "info" }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, titulo, descripcion, tono }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ notificar }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 shadow-md animate-fade-up",
            )}
          >
            {ICONOS[t.tono]}
            <div>
              <p className="text-[13px] font-medium text-foreground">{t.titulo}</p>
              {t.descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{t.descripcion}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
