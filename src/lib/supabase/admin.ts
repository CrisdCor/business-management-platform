import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente con la service role key: acceso administrativo que ignora RLS.
 * SOLO debe importarse desde código de servidor (Route Handlers / Server
 * Actions) para operaciones explícitamente administrativas, como crear
 * usuarios de Auth o resetear contraseñas en nombre del Superadministrador.
 * `import "server-only"` hace que el bundler falle si esto se importa
 * accidentalmente desde un Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan variables de entorno para el cliente administrativo de Supabase (SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
