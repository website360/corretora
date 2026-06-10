import "server-only";
import type { EmailEvent } from "@/config/email-templates";
import { getAutoChannels, sendEventEmail, sendEventWhatsapp } from "./templates.server";

/**
 * Dispara um evento de mensagem ao cliente: envia automaticamente os canais que
 * o ADMIN marcou como "enviar por padrão" nas Configurações. Best-effort.
 */
export async function dispatchEvent(
  companyId: string,
  event: EmailEvent,
  recipient: { email?: string | null; phone?: string | null },
  vars: Record<string, string | undefined>,
): Promise<{ email: boolean; whatsapp: boolean }> {
  const auto = await getAutoChannels(companyId, event);
  const [email, whatsapp] = await Promise.all([
    auto.email && recipient.email
      ? sendEventEmail(companyId, event, recipient.email, vars)
      : Promise.resolve({ sent: false }),
    auto.whatsapp && recipient.phone
      ? sendEventWhatsapp(companyId, event, recipient.phone, vars)
      : Promise.resolve({ sent: false }),
  ]);
  return { email: email.sent, whatsapp: whatsapp.sent };
}
