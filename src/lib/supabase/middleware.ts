import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/config/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_ROUTES = ["/login", "/cadastro", "/recuperar-senha", "/convite", "/auth"];

// Server-to-server endpoints with their own auth (no user session).
const PUBLIC_API_ROUTES = ["/api/billing/webhook"];

function isPublic(pathname: string) {
  return (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))
  );
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
    return NextResponse.redirect(url);
  }

  // Authenticated users shouldn't see auth screens.
  if (user && isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
