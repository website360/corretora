import { createClient } from "@supabase/supabase-js";
import { env, getServiceRoleKey } from "@/config/env";

/**
 * Service-role Supabase client — SERVER ONLY.
 * Bypasses RLS; never import this from client code. Used for admin
 * operations such as creating auth users (team invites).
 */
export function getSupabaseAdminClient() {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione-a ao .env.local para habilitar a criação de usuários.",
    );
  }
  return createClient(env.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
