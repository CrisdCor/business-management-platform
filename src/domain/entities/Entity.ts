/**
 * Clase base abstracta para toda entidad de dominio.
 *
 * Encapsula identidad y metadatos de auditoría comunes (id, fechas) y define
 * el contrato que toda entidad concreta debe cumplir (serialización a un
 * "row" plano, comparación por identidad). El resto de entidades del dominio
 * (Usuario, Requisicion, Compra, ...) heredan de esta clase, lo que evita
 * duplicar esta lógica y mantiene una jerarquía de objetos coherente.
 */
export abstract class Entity<TRow extends { id: string }> {
  protected constructor(
    public readonly id: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /** Igualdad por identidad, no por valor: dos entidades son la misma si comparten id. */
  public equals(other: Entity<TRow> | null | undefined): boolean {
    if (!other) return false;
    return this.id === other.id;
  }

  /** Serializa la entidad a un objeto plano listo para persistir/transmitir. */
  public abstract toRow(): TRow;
}

/** Utilidad compartida para parsear fechas provenientes de Postgres/Supabase. */
export function parseDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date();
  return typeof value === "string" ? new Date(value) : value;
}
