"use client";

import * as React from "react";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { marcarNotificacionLeidaAction, marcarTodasNotificacionesLeidasAction } from "@/app/actions/notificaciones";

export interface NotificacionVM {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

function tiempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(ms / (1000 * 60));
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

export function NotificacionesBell({ notificacionesIniciales }: { notificacionesIniciales: NotificacionVM[] }) {
  const [abierto, setAbierto] = React.useState(false);
  const [notificaciones, setNotificaciones] = React.useState(notificacionesIniciales);
  const contenedorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function marcarLeida(id: string) {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    await marcarNotificacionLeidaAction(id);
  }

  async function marcarTodas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    await marcarTodasNotificacionesLeidasAction();
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative rounded-md p-1.5 text-foreground transition-colors hover:bg-accent"
        aria-label="Notificaciones"
      >
        <Bell className="size-4" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-danger-foreground">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-80 origin-top-right animate-fade-up rounded-lg border border-border bg-surface p-1.5 shadow-md">
          <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
            <p className="text-[13px] font-medium text-foreground">Notificaciones</p>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="flex items-center gap-1 text-xs text-info hover:underline">
                <Check className="size-3" /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">Sin notificaciones.</p>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.leida && marcarLeida(n.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent",
                    !n.leida && "bg-info-bg/40",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {!n.leida && <span className="size-1.5 shrink-0 rounded-full bg-info" />}
                    <p className="text-[13px] font-medium text-foreground">{n.titulo}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.mensaje}</p>
                  <p className="text-[11px] text-muted-foreground">{tiempoRelativo(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
