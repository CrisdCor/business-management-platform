import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repositorio base genérico sobre una tabla de Supabase.
 *
 * Encapsula el acceso a datos crudo (select/insert/update/delete) para que
 * las clases concretas solo tengan que mapear filas a entidades de dominio
 * y añadir las consultas específicas que necesiten (joins, filtros de
 * negocio). Aplica el patrón Repository + Template Method: `mapRow` es el
 * único método que cada subclase está obligada a implementar.
 */
export abstract class BaseRepository<TDomain, TRow extends object> {
  protected constructor(
    protected readonly client: SupabaseClient,
    protected readonly table: string,
  ) {}

  /** Convierte una fila cruda de la tabla en la entidad de dominio correspondiente. */
  protected abstract mapRow(row: TRow): TDomain;

  protected get select(): string {
    return "*";
  }

  async findAll(): Promise<TDomain[]> {
    const { data, error } = await this.client.from(this.table).select(this.select);
    if (error) throw new Error(`[${this.table}] findAll: ${error.message}`);
    return (data as unknown as TRow[]).map((row) => this.mapRow(row));
  }

  async findById(id: string): Promise<TDomain | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select(this.select)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`[${this.table}] findById: ${error.message}`);
    return data ? this.mapRow(data as unknown as TRow) : null;
  }

  async insert(payload: Record<string, unknown>): Promise<TDomain> {
    const { data, error } = await this.client
      .from(this.table)
      .insert(payload)
      .select(this.select)
      .single();
    if (error) throw new Error(`[${this.table}] insert: ${error.message}`);
    return this.mapRow(data as unknown as TRow);
  }

  async update(id: string, payload: Record<string, unknown>): Promise<TDomain> {
    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq("id", id)
      .select(this.select)
      .single();
    if (error) throw new Error(`[${this.table}] update: ${error.message}`);
    return this.mapRow(data as unknown as TRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(this.table).delete().eq("id", id);
    if (error) throw new Error(`[${this.table}] delete: ${error.message}`);
  }
}
