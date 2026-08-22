"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { UsuarioSesion } from "@/components/layout/UserMenu";
import type { ModuloCodigo } from "@/domain/enums";
import { cn } from "@/lib/utils";

export function AppShell({
  usuario,
  modulosVisibles,
  children,
}: {
  usuario: UsuarioSesion;
  modulosVisibles: ModuloCodigo[];
  children: React.ReactNode;
}) {
  const [menuMovilAbierto, setMenuMovilAbierto] = React.useState(false);

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar de escritorio */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block">
        <Sidebar modulosVisibles={modulosVisibles} />
      </aside>

      {/* Sidebar móvil: overlay + panel deslizable */}
      {menuMovilAbierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30 animate-fade-in"
            onClick={() => setMenuMovilAbierto(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-sidebar-border bg-sidebar shadow-overlay animate-slide-in">
            <Sidebar modulosVisibles={modulosVisibles} onNavigate={() => setMenuMovilAbierto(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar usuario={usuario} onAbrirMenu={() => setMenuMovilAbierto(true)} />
        <main className="flex-1 overflow-y-auto bg-background px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
