"use client";

import { Menu } from "lucide-react";
import { UserMenu, type UsuarioSesion } from "@/components/layout/UserMenu";

export function Topbar({ usuario, onAbrirMenu }: { usuario: UsuarioSesion; onAbrirMenu: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onAbrirMenu}
        className="rounded-md p-1.5 text-foreground hover:bg-accent md:hidden"
        aria-label="Abrir navegación"
      >
        <Menu className="size-5" />
      </button>
      <div className="hidden md:block" />
      <UserMenu usuario={usuario} />
    </header>
  );
}
