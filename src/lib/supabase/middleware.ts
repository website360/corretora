import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/config/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_ROUTES = ["/login", "/cadastro", "/recuperar-senha", "/convite", "/auth"];

// Server-to-server / token-auth endpoints (no user session).
const PUBLIC_API_ROUTES = ["/api/billing/webhook", "/api/calendar/feed"];

function isPublic(pathname: string) {
  return (
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
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  // Unauthenticated → push to login (preserving intended destination).
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return noSharedCache(NextResponse.redirect(url));
  }

  // Authenticated users shouldn't see auth screens.
  if (user && isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return noSharedCache(NextResponse.redirect(url));
  }

  return noSharedCache(response);
}
