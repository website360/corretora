import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image
     * optimization files. Auth-guarding logic lives in updateSession.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/version|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
