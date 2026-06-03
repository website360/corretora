import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

/**
 * Browser-side Supabase client (singleton).
 * Use inside Client Components and hooks.
 *
 * Note: typed loosely on purpose — `src/types/database.ts` is a hand-written
 * approximation for the demo. Regenerate it with the Supabase CLI and add the
 * `<Database>` generic for full end-to-end type safety in production.
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
