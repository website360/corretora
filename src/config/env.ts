/**
 * Centralised, typed access to environment variables.
 * Public vars are inlined at build time by Next.js; server-only vars
 * are read lazily so they never leak into the client bundle.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Corretora SaaS",
  /**
   * When true (or when Supabase is not configured) the data layer serves
   * rich mocked data so the product is fully explorable without a backend.
   */
  useMocks:
    process.env.NEXT_PUBLIC_USE_MOCKS === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
} as const;

/** Server-only: never import this from a client component. */
export function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

/** Server-only: Resend API key for transactional e-mail. */
export function getResendApiKey() {
  return process.env.RESEND_API_KEY ?? "";
}

/** Remetente padrão dos e-mails (ex.: "Corretora SaaS <nao-responda@seudominio.com>"). */
export function getEmailFrom() {
  return process.env.EMAIL_FROM ?? `${env.appName} <onboarding@resend.dev>`;
}

/** Reply-to opcional para os e-mails transacionais. */
export function getEmailReplyTo() {
  return process.env.EMAIL_REPLY_TO || undefined;
}
