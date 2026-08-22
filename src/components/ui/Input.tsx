import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
          <input
            ref={ref}
            className={cn(
              "h-9 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm text-foreground shadow-xs",
              "placeholder:text-muted-foreground transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring",
              error && "border-danger focus:ring-danger/20 focus:border-danger",
              className,
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground shadow-xs",
          "placeholder:text-muted-foreground transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring",
          error && "border-danger focus:ring-danger/20 focus:border-danger",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-24 rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs",
        "placeholder:text-muted-foreground transition-colors duration-150 resize-y",
        "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("mb-1.5 block text-[13px] font-medium text-foreground", className)} {...props} />
  ),
);
Label.displayName = "Label";

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-danger">{children}</p>;
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-muted-foreground">{children}</p>;
}
