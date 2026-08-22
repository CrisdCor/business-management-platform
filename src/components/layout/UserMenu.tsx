"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SlideOver } from "@/components/ui/SlideOver";
import { Button } from "@/components/ui/Button";
import { PasswordInput, Label, FieldError } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cerrarSesionAction, cambiarPasswordAction } from "@/app/actions/auth";

export interface UsuarioSesion {
  nombre: string;
  correo: string;
  fotoUrl: string | null;
  etiquetaRoles: string;
}

export function UserMenu({ usuario }: { usuario: UsuarioSesion }) {
  const [abierto, setAbierto] = React.useState(false);
  const [modalPassword, setModalPassword] = React.useState(false);
  const contenedorRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent"
      >
        <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} size={28} />
        <span className="hidden text-left sm:block">
          <span className="block text-[13px] font-medium leading-tight text-foreground">{usuario.nombre}</span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-56 origin-top-right animate-fade-up rounded-lg border border-border bg-surface p-1.5 shadow-md">
          <div className="border-b border-border px-2.5 py-2">
            <p className="truncate text-[13px] font-medium text-foreground">{usuario.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{usuario.correo}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{usuario.etiquetaRoles}</p>
          </div>
          <button
            onClick={() => {
              setAbierto(false);
              setModalPassword(true);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground hover:bg-accent"
          >
            <KeyRound className="size-4" /> Cambiar contraseña
          </button>
          <button
            onClick={() => cerrarSesionAction().then(() => router.push("/login"))}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger hover:bg-danger-bg"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      )}

      <ModalCambiarPassword open={modalPassword} onClose={() => setModalPassword(false)} />
    </div>
  );
}

function ModalCambiarPassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = React.useState("");
  const [confirmacion, setConfirmacion] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const { notificar } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirmacion) return setError("Las contraseñas no coinciden.");

    setCargando(true);
    const resultado = await cambiarPasswordAction(password);
    setCargando(false);

    if (!resultado.ok) return setError(resultado.error ?? "No se pudo cambiar la contraseña.");

    notificar({ titulo: "Contraseña actualizada", tono: "success" });
    setPassword("");
    setConfirmacion("");
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Cambiar contraseña"
      width="sm"
      footer={
        <Button type="submit" form="form-password" loading={cargando}>
          Guardar
        </Button>
      }
    >
      <form id="form-password" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="password-nueva">Nueva contraseña</Label>
          <PasswordInput
            id="password-nueva"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="password-confirmacion">Confirmar contraseña</Label>
          <PasswordInput
            id="password-confirmacion"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <FieldError>{error}</FieldError>
      </form>
    </SlideOver>
  );
}
