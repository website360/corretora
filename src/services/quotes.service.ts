import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getCurrentUserId, getViewCompanyId } from "@/services/lookup";
import { contractsService } from "@/services/contracts.service";
import { ticketsService } from "@/services/tickets.service";
import { sleep, uid } from "@/lib/utils";
import type { Contract, Quote, QuoteOption, QuoteStatus } from "@/types/domain";

const mockQuotes: Quote[] = [];
const mockOptions: QuoteOption[] = [];

export interface NewQuoteOption {
  carrier_id?: string | null;
  product_id?: string | null;
  premium_cents?: number;
  commission_percent?: number | null;
  notes?: string | null;
}

export const quotesService = {
  async list(): Promise<Quote[]> {
    if (env.useMocks) {
      await sleep(200);
      return mockQuotes.filter((q) => q.company_id === getCurrentCompanyId());
    }
    const sb = getSupabaseBrowserClient();
    let query = sb.from("quotes").select("*");
    const cid = getViewCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Quote[]) ?? [];
  },

  async get(id: string): Promise<Quote | null> {
    if (env.useMocks) {
      await sleep(120);
      return mockQuotes.find((q) => q.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("quotes")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    return (data as Quote | null) ?? null;
  },

  async listOptions(quoteId: string): Promise<QuoteOption[]> {
    if (env.useMocks) {
      await sleep(100);
      return mockOptions.filter((o) => o.quote_id === quoteId).sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("quote_options")
      .select("*")
      .eq("quote_id", quoteId)
      .order("position");
    if (error) throw error;
    return (data as QuoteOption[]) ?? [];
  },

  async create(
    input: Pick<Quote, "customer_id"> & Partial<Pick<Quote, "owner_id" | "status" | "title" | "notes">>,
  ): Promise<Quote> {
    const company_id = getCurrentCompanyId();
    const me = getCurrentUserId();
    if (env.useMocks) {
      await sleep(280);
      const q: Quote = {
        id: uid("qt"),
        company_id,
        number: Math.max(0, ...mockQuotes.map((x) => x.number)) + 1,
        customer_id: input.customer_id,
        owner_id: input.owner_id ?? null,
        status: input.status ?? "draft",
        title: input.title ?? null,
        notes: input.notes ?? null,
        created_by: me || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockQuotes.unshift(q);
      return q;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("quotes")
      .insert({
        company_id,
        customer_id: input.customer_id,
        owner_id: input.owner_id ?? null,
        status: input.status ?? "draft",
        title: input.title ?? null,
        notes: input.notes ?? null,
        created_by: me || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Quote;
  },

  async update(
    id: string,
    patch: Partial<Pick<Quote, "owner_id" | "status" | "title" | "notes" | "customer_id">>,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(200);
      const q = mockQuotes.find((x) => x.id === id);
      if (q) Object.assign(q, patch, { updated_at: new Date().toISOString() });
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("quotes")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async setStatus(id: string, status: QuoteStatus): Promise<void> {
    return this.update(id, { status });
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(180);
      const i = mockQuotes.findIndex((q) => q.id === id);
      if (i !== -1) mockQuotes.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("quotes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  /* ─────────────────────────────── options ─────────────────────────────── */
  async addOption(quoteId: string, opt: NewQuoteOption): Promise<QuoteOption> {
    const company_id = getCurrentCompanyId();
    if (env.useMocks) {
      await sleep(160);
      const siblings = mockOptions.filter((o) => o.quote_id === quoteId);
      const record: QuoteOption = {
        id: uid("qo"),
        company_id,
        quote_id: quoteId,
        carrier_id: opt.carrier_id ?? null,
        product_id: opt.product_id ?? null,
        premium_cents: opt.premium_cents ?? 0,
        commission_percent: opt.commission_percent ?? null,
        notes: opt.notes ?? null,
        is_selected: siblings.length === 0,
        position: Math.max(-1, ...siblings.map((o) => o.position)) + 1,
        created_at: new Date().toISOString(),
      };
      mockOptions.push(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data: existing } = await sb.from("quote_options").select("id, position").eq("quote_id", quoteId);
    const rows = (existing as { id: string; position: number }[] | null) ?? [];
    const position = Math.max(-1, ...rows.map((o) => o.position)) + 1;
    const { data, error } = await sb
      .from("quote_options")
      .insert({
        company_id,
        quote_id: quoteId,
        carrier_id: opt.carrier_id ?? null,
        product_id: opt.product_id ?? null,
        premium_cents: opt.premium_cents ?? 0,
        commission_percent: opt.commission_percent ?? null,
        notes: opt.notes ?? null,
        is_selected: rows.length === 0, // first option is selected by default
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as QuoteOption;
  },

  async updateOption(
    id: string,
    patch: Partial<Pick<QuoteOption, "carrier_id" | "product_id" | "premium_cents" | "commission_percent" | "notes">>,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(140);
      const o = mockOptions.find((x) => x.id === id);
      if (o) Object.assign(o, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("quote_options").update(patch).eq("id", id);
    if (error) throw error;
  },

  async removeOption(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const i = mockOptions.findIndex((o) => o.id === id);
      if (i !== -1) mockOptions.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("quote_options").delete().eq("id", id);
    if (error) throw error;
  },

  /** Marks one option as the selected one (and clears the others). */
  async selectOption(quoteId: string, optionId: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      mockOptions.forEach((o) => {
        if (o.quote_id === quoteId) o.is_selected = o.id === optionId;
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("quote_options").update({ is_selected: false }).eq("quote_id", quoteId);
    await sb.from("quote_options").update({ is_selected: true }).eq("id", optionId);
  },

  /* ─────────────────────────── ClickSign signature ─────────────────────── */
  /** Sends the quote's document to ClickSign for signature (status → awaiting). */
  async sendForSignature(
    quoteId: string,
    input: {
      fileName: string;
      fileBase64: string;
      signers: { name: string; email: string; document?: string | null }[];
    },
  ): Promise<{ documentKey: string }> {
    const res = await fetch("/api/integrations/clicksign/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId, ...input }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Falha ao enviar para assinatura.");
    return json;
  },

  /** Checks ClickSign for a signed document and finalizes the quote if signed. */
  async checkSignature(
    quoteId: string,
  ): Promise<{ signed: boolean; contractId?: string | null; status?: string }> {
    const res = await fetch("/api/integrations/clicksign/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Falha ao verificar assinatura.");
    return json;
  },

  /**
   * Turns a signed quote into a contract built from its selected option, marks
   * the quote as won, and (optionally) spins up the follow-up tasks.
   */
  async generateContract(
    quote: Quote,
    opts: {
      startsAt?: string | null;
      endsAt?: string | null;
      createWelcome?: boolean;
      createRenewal?: boolean;
    } = {},
  ): Promise<Contract> {
    const options = await this.listOptions(quote.id);
    const chosen = options.find((o) => o.is_selected) ?? options[0];
    if (!chosen) throw new Error("Adicione ao menos uma opção ao orçamento antes de gerar o contrato.");

    const contract = await contractsService.create({
      customer_id: quote.customer_id,
      product_id: chosen.product_id,
      carrier_id: chosen.carrier_id,
      owner_id: quote.owner_id,
      policy_number: null,
      starts_at: opts.startsAt ?? null,
      ends_at: opts.endsAt ?? null,
      premium_cents: chosen.premium_cents,
      commission_percent: chosen.commission_percent,
      status: "active",
      notes: quote.notes,
      quote_id: quote.id,
    });

    await this.setStatus(quote.id, "won");

    // Follow-up tasks (best-effort — never block the conversion).
    if (opts.createWelcome) {
      try {
        await ticketsService.create({
          title: "Boas-vindas ao novo cliente",
          description: "Enviar mensagem de boas-vindas e orientações iniciais.",
          priority: "medium",
          subject_type: "customer",
          customer_id: quote.customer_id,
          assignee_id: quote.owner_id ?? undefined,
          tags: ["boas-vindas"],
        });
      } catch {
        /* ignore */
      }
    }
    if (opts.createRenewal && opts.endsAt) {
      try {
        const due = new Date(`${opts.endsAt}T09:00:00`);
        due.setDate(due.getDate() - 30);
        await ticketsService.create({
          title: "Renovação de apólice",
          description: "Lembrete automático de renovação do contrato.",
          priority: "medium",
          subject_type: "carrier",
          customer_id: quote.customer_id,
          product_id: chosen.product_id ?? undefined,
          assignee_id: quote.owner_id ?? undefined,
          due_at: due.toISOString(),
          tags: ["renovação"],
        });
      } catch {
        /* ignore */
      }
    }
    return contract;
  },
};
