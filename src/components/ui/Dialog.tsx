"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
}

/** Diálogo centrado y compacto para confirmaciones puntuales (rechazar, eliminar, resetear contraseña). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  loading = false,
}: ConfirmDialogProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" />
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-overlay animate-fade-up",
        )}
      >
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
              <AlertTriangle className="size-4.5" />
            </span>
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            loading={loading}
            onClick={() => onConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
