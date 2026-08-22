"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/** Barra de filtros al estilo de los paneles de Vercel: buscador + selects compactos. */
export function FilterBar({
  busqueda,
  onBusquedaChange,
  placeholder = "Buscar...",
  children,
  className,
}: {
  busqueda?: string;
  onBusquedaChange?: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-center gap-2", className)}>
      {onBusquedaChange && (
        <div className="min-w-[220px] flex-1 sm:max-w-xs">
          <Input
            icon={<Search className="size-4" />}
            placeholder={placeholder}
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
        </div>
      )}
      {children}
      {!onBusquedaChange && !children && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="size-3.5" /> Sin filtros disponibles
        </span>
      )}
    </div>
  );
}
