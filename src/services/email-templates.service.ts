import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { EmailTemplateRow } from "@/types/domain";

const mockRows: EmailTemplateRow[] = [];

export const emailTemplatesService = {
  async list(): Promise<EmailTemplateRow[]> {
    if (env.useMocks) {
      await sleep(80);
      return [...mockRows];
    }
    const sb = getSupabaseBrowserClient();
    let q = sb.from("email_templates").select("*");
    const cid = getCurrentCompanyId();
    if (cid) q = q.eq("company_id", cid);
    const { data, error } = await q.order("created_at");
    if (error) throw error;
    return (data as EmailTemplateRow[]) ?? [];
  },

  /** Cria ou atualiza a linha (única) de um evento de sistema, por canal. */
  async saveSystem(
    event: string,
    channel: string,
    existingId: string | null,
    patch: Pick<EmailTemplateRow, "name" | "subject" | "body" | "enabled" | "auto_send">,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      if (existingId) {
        const r = mockRows.find((x) => x.id === existingId);
        if (r) Object.assign(r, patch);
      } else {
        mockRows.push({
          id: uid("et"),
          company_id: getCurrentCompanyId() || "co_apex",
          event,
          channel,
          is_custom: false,
          created_at: new Date().toISOString(),
          ...patch,
        });
      }
      return;
    }
    const sb = getSupabaseBrowserClient();
    if (existingId) {
      const { error } = await sb.from("email_templates").update(patch).eq("id", existingId);
      if (error) throw error;
    } else {
      const { error } = await sb
        .from("email_templates")
        .insert({ ...patch, event, channel, is_custom: false, company_id: getCurrentCompanyId() });
      if (error) throw error;
    }
  },

  async createCustom(patch: {
    name: string;
    subject: string;
    body: string;
  }): Promise<EmailTemplateRow> {
    if (env.useMocks) {
      await sleep(120);
      const r: EmailTemplateRow = {
        id: uid("et"),
        company_id: getCurrentCompanyId() || "co_apex",
        event: "custom",
        channel: "email",
        is_custom: true,
        enabled: true,
        auto_send: false,
        created_at: new Date().toISOString(),
        ...patch,
      };
      mockRows.push(r);
      return r;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("email_templates")
      .insert({
        ...patch,
        event: "custom",
        channel: "email",
        is_custom: true,
        enabled: true,
        auto_send: false,
        company_id: getCurrentCompanyId(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as EmailTemplateRow;
  },

  async update(
    id: string,
    patch: Partial<Pick<EmailTemplateRow, "name" | "subject" | "body" | "enabled" | "auto_send">>,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(100);
      const r = mockRows.find((x) => x.id === id);
      if (r) Object.assign(r, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("email_templates").update(patch).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(100);
      const i = mockRows.findIndex((x) => x.id === id);
      if (i >= 0) mockRows.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("email_templates").delete().eq("id", id);
    if (error) throw error;
  },
};
