import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/config/env";

/**
 * Callback de OAuth (Google). O Supabase redireciona para cá com um `code`
 * que trocamos por uma sessão, gravando os cookies de auth antes de mandar
 * o usuário para o destino pretendido.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  // Evita open-redirect: só aceita caminhos internos.
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  // Host público. Atrás de um proxy/load balancer o `origin` do request reflete
  // o endereço interno (ex.: localhost:8080); preferimos o host encaminhado pelo
  // proxy e, em seguida, a URL canônica configurada (NEXT_PUBLIC_APP_URL).
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : env.appUrl || origin;

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=oauth`);
}
