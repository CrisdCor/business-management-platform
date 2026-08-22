import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

/**
 * Select nativo estilizado para verse consistente con el resto del sistema
 * de diseño. Se prioriza accesibilidad y soporte móvil sobre un combobox a
 * medida, suficiente para las listas cortas de este MVP (catálogos, estados).
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-input bg-surface pl-3 pr-8 text-sm text-foreground shadow-xs",
          "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring",
          error && "border-danger focus:ring-danger/20 focus:border-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
Select.displayName = "Select";
