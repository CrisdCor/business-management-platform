import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/app/login/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-veloces.png" alt="Veloces" className="h-8 w-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Gestión Administrativa</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          ¿Olvidaste tu contraseña? Pídele al Superadministrador que la reinicie por ti.
        </p>
      </div>
    </div>
  );
}
