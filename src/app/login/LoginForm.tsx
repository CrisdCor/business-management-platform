"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { iniciarSesionAction, type AccionResultado } from "@/app/actions/auth";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ESTADO_INICIAL: AccionResultado = { ok: true };

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const [estado, formAction, enviando] = useActionState(iniciarSesionAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <Label htmlFor="correo">Usuario</Label>
        <Input id="correo" name="correo" type="email" placeholder="nombre@empresa.com" icon={<Mail className="size-4" />} required autoFocus />
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" icon={<Lock className="size-4" />} required />
      </div>

      {!estado.ok && <FieldError>{estado.error}</FieldError>}

      <Button type="submit" className="mt-1" loading={enviando}>
        Ingresar
      </Button>
    </form>
  );
}
