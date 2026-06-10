import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  defaultTemplate,
  renderTemplateText,
  type EmailEvent,
  type MessageChannel,
} from "@/config/email-templates";
import type { EmailTemplateRow } from "@/types/domain";
import { sendEmailForCompany } from "./smtp";
import { sendWhatsappText } from "@/lib/whatsapp/send";
import { GenericEmail } from "./templates/generic";

async function effectiveTemplate(companyId: string, event: EmailEvent, channel: MessageChannel) {
  const def = defaultTemplate(event);
  const base =
    channel === "email"
      ? { subject: def.email.subject, body: def.email.html }
      : { subject: "", body: def.whatsapp.text };
  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("email_templates")
      .select("*")
      .eq("company_id", companyId)
      .eq("event", event)
      .eq("channel", channel)
      .eq("is_custom", false)
      .maybeSingle();
    const row = data as EmailTemplateRow | null;
    if (row) return { subject: row.subject, body: row.body, enabled: row.enabled };
  } catch {
    /* usa o padrão */
  }
  return { ...base, enabled: true };
}

/** Envia o e-mail (HTML) de um evento ao cliente. Best-effort. */
export async function sendEventEmail(
  companyId: string,
  event: EmailEvent,
  to: string,
  vars: Record<string, string | undefined>,
): Promise<{ sent: boolean }> {
  if (!to) return { sent: false };
  try {
    const t = await effectiveTemplate(companyId, event, "email");
    if (!t.enabled) return { sent: false };
    const subject = renderTemplateText(t.subject, vars);
    const html = renderTemplateText(t.body, vars);
    const res = await sendEmailForCompany(companyId, {
      to,
      subject,
      react: GenericEmail({ html, preview: subject }),
    });
    return { sent: res.sent === true };
  } catch (e) {
    console.error("[msg] sendEventEmail falhou:", e);
    return { sent: false };
  }
}

/** Envia o WhatsApp (texto) de um evento ao cliente. Best-effort. */
export async function sendEventWhatsapp(
  companyId: string,
  event: EmailEvent,
  toPhone: string,
  vars: Record<string, string | undefined>,
): Promise<{ sent: boolean }> {
  if (!toPhone) return { sent: false };
  try {
    const t = await effectiveTemplate(companyId, event, "whatsapp");
    if (!t.enabled) return { sent: false };
    const text = renderTemplateText(t.body, vars);
    return await sendWhatsappText(companyId, toPhone, text);
  } catch (e) {
    console.error("[msg] sendEventWhatsapp falhou:", e);
    return { sent: false };
  }
}
