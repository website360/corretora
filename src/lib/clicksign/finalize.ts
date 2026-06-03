import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClickSignConfig } from "@/lib/clicksign/server";
import type { ClickSignIntegration, Quote } from "@/types/domain";

type Admin = ReturnType<typeof getSupabaseAdminClient>;

/** Reads a company's ClickSign credentials from its settings. */
export async function readClickSignConfig(
  admin: Admin,
  companyId: string,
): Promise<ClickSignConfig | null> {
  const { data } = await admin.from("companies").select("settings").eq("id", companyId).single();
  const cs = (data as { settings?: { integrations?: { clicksign?: ClickSignIntegration } } } | null)
    ?.settings?.integrations?.clicksign;
  if (!cs?.apiToken) return null;
  return { apiToken: cs.apiToken, environment: cs.environment === "production" ? "production" : "sandbox" };
}

export async function readWebhookSecret(admin: Admin, companyId: string): Promise<string | null> {
  const { data } = await admin.from("companies").select("settings").eq("id", companyId).single();
  const cs = (data as { settings?: { integrations?: { clicksign?: ClickSignIntegration } } } | null)
    ?.settings?.integrations?.clicksign;
  return cs?.webhookSecret ?? null;
}

/**
 * Idempotently turns a signed quote into a contract (built from the selected
 * option), marks the quote won, and creates a welcome task. Returns the
 * contract id. Uses the admin client (callable from webhooks without a session).
 */
export async function finalizeSignedQuote(
  admin: Admin,
  quote: Quote,
  signedUrl: string | null,
): Promise<string | null> {
  if (quote.status === "won") {
    const { data } = await admin.from("contracts").select("id").eq("quote_id", quote.id).maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }

  const { data: opts } = await admin
    .from("quote_options")
    .select("*")
    .eq("quote_id", quote.id)
    .order("position");
  const options = (opts as Array<Record<string, unknown>>) ?? [];
  const chosen = options.find((o) => o.is_selected) ?? options[0];

  let contractId: string | null = null;
  if (chosen) {
    const { data: contract } = await admin
      .from("contracts")
      .insert({
        company_id: quote.company_id,
        customer_id: quote.customer_id,
        product_id: chosen.product_id ?? null,
        carrier_id: chosen.carrier_id ?? null,
        owner_id: quote.owner_id,
        status: "active",
        premium_cents: chosen.premium_cents ?? 0,
        commission_percent: chosen.commission_percent ?? null,
        notes: quote.notes,
        quote_id: quote.id,
      })
      .select("id")
      .single();
    contractId = (contract as { id: string } | null)?.id ?? null;
  }

  // Carry the signed document over to the contract so it lands with the proposal.
  if (contractId && signedUrl) {
    try {
      await admin.from("contract_attachments").insert({
        company_id: quote.company_id,
        contract_id: contractId,
        name: "Documento assinado",
        size: 0,
        mime_type: "application/pdf",
        storage_path: signedUrl,
        uploaded_by: null,
      });
    } catch {
      /* ignore — attachment is best-effort */
    }
  }

  await admin
    .from("quotes")
    .update({ status: "won", signed_at: new Date().toISOString(), signed_url: signedUrl })
    .eq("id", quote.id);

  // Welcome task (best-effort).
  try {
    const { data: board } = await admin
      .from("task_boards")
      .select("id")
      .eq("company_id", quote.company_id)
      .order("is_default", { ascending: false })
      .order("position")
      .limit(1)
      .maybeSingle();
    const boardId = (board as { id: string } | null)?.id ?? null;
    let columnId: string | null = null;
    if (boardId) {
      const { data: col } = await admin
        .from("task_columns")
        .select("id")
        .eq("board_id", boardId)
        .order("position")
        .limit(1)
        .maybeSingle();
      columnId = (col as { id: string } | null)?.id ?? null;
    }
    await admin.from("tickets").insert({
      company_id: quote.company_id,
      title: "Boas-vindas ao novo cliente",
      description: "Documento assinado via ClickSign. Enviar boas-vindas e orientações.",
      priority: "medium",
      subject_type: "customer",
      customer_id: quote.customer_id,
      assignee_id: quote.owner_id,
      board_id: boardId,
      column_id: columnId,
      tags: ["boas-vindas"],
    });
  } catch {
    /* ignore — task creation must not block signing */
  }

  return contractId;
}
