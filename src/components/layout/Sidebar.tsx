"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/components/layout/nav-config";
import type { ModuloCodigo } from "@/domain/enums";
import { cn } from "@/lib/utils";

export function Sidebar({
  modulosVisibles,
  onNavigate,
}: {
  modulosVisibles: ModuloCodigo[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visibles = new Set(modulosVisibles);

  return (
    <nav className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-sidebar px-3 py-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          V
        </span>
        <span className="text-sm font-semibold text-foreground">Veloces</span>
      </Link>

      <div className="flex flex-1 flex-col gap-5">
        {NAV_GROUPS.map((grupo) => {
          const items = grupo.items.filter((item) => !item.modulo || visibles.has(item.modulo));
          if (items.length === 0) return null;

          return (
            <div key={grupo.titulo}>
              <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {grupo.titulo}
              </p>
              <div className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const activo = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-foreground",
                        "transition-colors duration-150 hover:bg-sidebar-active/70",
                        activo && "bg-sidebar-active text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={2} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
