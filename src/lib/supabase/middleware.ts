import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/config/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_ROUTES = ["/login", "/cadastro", "/recuperar-senha", "/convite", "/auth"];

// Páginas de marketing: públicas e visíveis para qualquer um (logado ou não),
// sem redirecionar.
const MARKETING_ROUTES = ["/lp"];

// Server-to-server / token-auth endpoints (no user session).
const PUBLIC_API_ROUTES = ["/api/billing/webhook", "/api/calendar/feed", "/api/leads"];

function isMarketing(pathname: string) {
  return MARKETING_ROUTES.some((route) => pathname.startsWith(route));
}

function isPublic(pathname: string) {
  return (
    isMarketing(pathname) ||
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))
  );
}

/**
 * Impede que CDNs (Cloudflare) cacheiem respostas de documento/RSC.
 *
 * O Next.js prerenderiza páginas e responde com `Cache-Control: s-maxage`
 * tanto para o HTML quanto para o payload RSC (`text/x-component`), diferindo
 * apenas no header `Vary: RSC`. O Cloudflare ignora o `Vary`, então as duas
 * variantes colidem na mesma chave de cache da borda e o flight cru acaba
 * sendo servido no lugar da página. Marcar como `private, no-store` força a
 * borda a sempre buscar da origem. Não afeta `_next/static` (excluído pelo
 * matcher do middleware), que continua imutável e cacheável.
 */
function noSharedCache<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Refreshes the Supabase auth session on every request and guards
 * protected routes. When mocks are enabled it becomes a no-op so the
 * product is fully navigable without a backend.
 */
// Host dedicado à landing page de vendas: serve a LP na raiz "/".
// Configurável por env; padrão = subdomínio do cliente.
const MARKETING_HOST = (
  process.env.MARKETING_HOST || "lp-corretora.agenciamay.com.br"
).toLowerCase();

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No host de marketing, a raiz mostra a landing page (/lp) sem redirect.
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(":")[0]!
    .toLowerCase();
  if (host === MARKETING_HOST && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/lp";
    return noSharedCache(NextResponse.rewrite(url));
  }

  if (env.useMocks) return response;

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isCustomer = user?.app_metadata?.user_type === "customer";
  const inPortal = pathname === "/portal" || pathname.startsWith("/portal/");
  const isPortalLogin = pathname.startsWith("/portal/login");
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return noSharedCache(NextResponse.redirect(url));
  };

  // ── Realm do PORTAL DO CLIENTE (/portal) ──
  if (inPortal) {
    if (!user) return isPortalLogin ? noSharedCache(response) : redirectTo("/portal/login");
    if (!isCustomer) return redirectTo("/dashboard"); // corretor não usa o portal
    if (isPortalLogin) return redirectTo("/portal"); // cliente logado fora do login
    return noSharedCache(response);
  }

  // Cliente autenticado só transita no /portal e nas APIs do portal
  // (+ marketing e callback de auth).
  if (user && isCustomer) {
    if (
      isMarketing(pathname) ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api/portal")
    ) {
      return noSharedCache(response);
    }
    return redirectTo("/portal");
  }

  // ── Realm do CORRETOR (app) ──
  // Unauthenticated → push to login (preserving intended destination).
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return noSharedCache(NextResponse.redirect(url));
  }

  // Authenticated users shouldn't see auth screens (mas podem ver o marketing).
  if (user && isPublic(pathname) && !isMarketing(pathname)) {
    return redirectTo("/dashboard");
  }

  return noSharedCache(response);
}
