import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground border-transparent",
        success: "bg-success-bg text-success border-transparent",
        warning: "bg-warning-bg text-warning border-transparent",
        danger: "bg-danger-bg text-danger border-transparent",
        info: "bg-info-bg text-info border-transparent",
        outline: "bg-transparent text-foreground border-border",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
