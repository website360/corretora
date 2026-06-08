import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
