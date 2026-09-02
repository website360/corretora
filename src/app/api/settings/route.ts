import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unmaskIntegrations } from "@/lib/settings/secrets";
import type { CompanySettings } from "@/types/domain";

/**
 * POST /api/settings — grava `companies.settings` de forma segura.
 *
 * Existe porque o cliente não recebe mais os segredos de integração (eles vão
 * mascarados na sessão). Se a gravação continuasse sendo feita direto do
 * navegador, salvar uma integração sobrescreveria as outras com o marcador.
 * Aqui o merge acontece no servidor e todo campo que voltou mascarado é
 * restaurado a partir do que está no banco.
 *
 * Autorização: usa o cliente do USUÁRIO (não o admin), então as policies de RLS
 * continuam sendo a única fonte de verdade sobre quem pode alterar o quê — o
 * comportamento de permissão é exatamente o mesmo de antes.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    companyId?: string;
    patch?: Partial<CompanySettings>;
  } | null;

  if (!body?.companyId || !body.patch || typeof body.patch !== "object") {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // Leitura com o cliente do usuário: se o RLS não deixar ler, também não deixa gravar.
  const { data: current, error: readErr } = await sb
    .from("companies")
    .select("settings")
    .eq("id", body.companyId)
    .single();
  if (readErr || !current) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const stored = ((current as { settings: CompanySettings | null }).settings ??
    {}) as CompanySettings;

  const patch = { ...body.patch };
  if ("integrations" in patch) {
    patch.integrations = unmaskIntegrations(patch.integrations, stored.integrations);
  }

  const merged: CompanySettings = { ...stored, ...patch };

  const { error: writeErr } = await sb
    .from("companies")
    .update({ settings: merged })
    .eq("id", body.companyId);
  if (writeErr) {
    // RLS negando a escrita cai aqui — mesma mensagem que a UI já tratava.
    return NextResponse.json({ error: writeErr.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
