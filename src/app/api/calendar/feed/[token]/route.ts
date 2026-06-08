import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCalendar } from "@/lib/ics";
import { env } from "@/config/env";
import type { CalendarEvent, Ticket } from "@/types/domain";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/calendar/feed/<token> — feed iCalendar (.ics) público, identificado
 * por um token secreto do usuário. Retorna os eventos em que ele é responsável,
 * envolvido ou criador. Assinável no Outlook/Google/Apple.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: "Token inválido." }, { status: 404 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: user } = await admin
    .from("users")
    .select("id, name, company_id")
    .eq("calendar_token", token)
    .single();
  if (!user) {
    return NextResponse.json({ error: "Feed não encontrado." }, { status: 404 });
  }
  const u = user as { id: string; name: string; company_id: string };

  const mine = `owner_id.eq.${u.id},created_by.eq.${u.id},participant_ids.cs.{${u.id}}`;
  const mineTask = `assignee_id.eq.${u.id},created_by.eq.${u.id},participant_ids.cs.{${u.id}}`;

  // Eventos + tarefas com vencimento em que o usuário é responsável,
  // envolvido ou criador.
  const [eventsRes, tasksRes] = await Promise.all([
    admin
      .from("calendar_events")
      .select("*")
      .eq("company_id", u.company_id)
      .is("deleted_at", null)
      .or(mine)
      .order("starts_at", { ascending: true }),
    admin
      .from("tickets")
      .select("*")
      .eq("company_id", u.company_id)
      .is("deleted_at", null)
      .not("due_at", "is", null)
      .or(mineTask),
  ]);
  if (eventsRes.error || tasksRes.error) {
    const msg = (eventsRes.error ?? tasksRes.error)?.message ?? "Erro ao ler a agenda.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const ics = buildCalendar(
    {
      events: (eventsRes.data as CalendarEvent[]) ?? [],
      tasks: (tasksRes.data as Ticket[]) ?? [],
    },
    `${env.appName} — Agenda de ${u.name}`,
  );

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="agenda.ics"',
    },
  });
}
