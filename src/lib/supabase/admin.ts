import { createClient } from "@supabase/supabase-js";
import { env, getServiceRoleKey } from "@/config/env";

/**
 * Service-role Supabase client — SERVER ONLY.
 * Bypasses RLS; never import this from client code. Used for admin
 * operations such as creating auth users (team invites).
 *
 * `actorId` identifica, para o log de auditoria, a pessoa em nome de quem a
 * rota está agindo — sem ele a escrita aparece como "Sistema", que é o certo
 * para webhooks e rotinas. O header só é aceito pelo trigger em requisições
 * autenticadas como service_role (chave de servidor), então não é forjável
 * pelo navegador. Passe SEMPRE o id já validado da sessão, nunca algo vindo
 * do corpo da requisição.
 */
export function getSupabaseAdminClient(actorId?: string) {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione-a ao .env.local para habilitar a criação de usuários.",
    );
  }
  return createClient(env.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(actorId ? { global: { headers: { "x-actor-id": actorId } } } : {}),
  });
}
