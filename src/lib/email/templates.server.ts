import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  defaultTemplate,
  renderTemplateText,
  type EmailEvent,
} from "@/config/email-templates";
import type { EmailTemplateRow } from "@/types/domain";
import { sendEmailForCompany } from "./smtp";
import { GenericEmail } from "./templates/generic";

async function effectiveTemplate(companyId: string, event: EmailEvent) {
  const def = defaultTemplate(event);
  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("email_templates")
      .select("*")
      .eq("company_id", companyId)
      .eq("event", event)
      .eq("is_custom", false)
      .maybeSingle();
    const row = data as EmailTemplateRow | null;
    if (row) return { subject: row.subject, body: row.body, enabled: row.enabled };
  } catch {
    /* usa o padrão */
  }
  return { subject: def.subject, body: def.body, enabled: true };
}

/**
 * Envia o e-mail de um EVENTO ao cliente, usando o template efetivo da empresa
 * (override no banco ou o padrão em código) e o SMTP da corretora (fallback
 * Resend). Best-effort — nunca lança. `to` é o e-mail do cliente.
 */
export async function sendEventEmail(
  companyId: string,
  event: EmailEvent,
  to: string,
  vars: Record<string, string | undefined>,
): Promise<{ sent: boolean }> {
  if (!to) return { sent: false };
  try {
    const t = await effectiveTemplate(companyId, event);
    if (!t.enabled) return { sent: false };
    const subject = renderTemplateText(t.subject, vars);
    const bodyText = renderTemplateText(t.body, vars);
    const res = await sendEmailForCompany(companyId, {
      to,
      subject,
      react: GenericEmail({ bodyText }),
    });
    return { sent: res.sent === true };
  } catch (e) {
    console.error("[email] sendEventEmail falhou:", e);
    return { sent: false };
  }
}
