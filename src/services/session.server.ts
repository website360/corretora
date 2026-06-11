import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Company, SessionUser, User } from "@/types/domain";

/**
 * Resolves the authenticated user + tenant on the server (App Router layout).
 * Redirects to /login when there is no valid session or profile.
 */
export async function getServerSessionUser(): Promise<SessionUser> {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("users")
    .select("*, company:companies(*)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { company, ...rest } = profile as unknown as User & { company: Company };
  return { ...(rest as User), company } as SessionUser;
}

/**
 * Count of active (non-terminal stage) tasks. Para super admin com uma empresa
 * selecionada no filtro global, escopa pela `companyId` (senão o RLS conta tudo).
 */
export async function getServerTicketBadge(companyId?: string | null): Promise<number> {
  const sb = await getSupabaseServerClient();
  const { data: stages } = await sb
    .from("task_stages")
    .select("id")
    .eq("is_terminal", false);
  const ids = ((stages as { id: string }[] | null) ?? []).map((s) => s.id);
  if (ids.length === 0) return 0;
  let q = sb.from("tickets").select("id", { count: "exact", head: true }).in("stage_id", ids);
  if (companyId) q = q.eq("company_id", companyId);
  const { count } = await q;
  return count ?? 0;
}
