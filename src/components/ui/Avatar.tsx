import { cn } from "@/lib/utils";

export function Avatar({
  nombre,
  fotoUrl,
  size = 32,
  className,
}: {
  nombre: string;
  fotoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- URL dinámica de Supabase Storage, sin dominio fijo para next/image
    return (
      <img
        src={fotoUrl}
        alt={nombre}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {iniciales}
    </span>
  );
}
