import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { env, getResendApiKey, getEmailFrom, getEmailReplyTo } from "@/config/env";
import { getPlatformSetting } from "@/lib/platform-settings/server";

/** Configuração efetiva do e-mail: banco (admin) sobrescreve, env é fallback. */
async function resolveEmailConfig() {
  const [apiKey, from, replyTo] = await Promise.all([
    getPlatformSetting("resend_api_key", getResendApiKey()),
    getPlatformSetting("email_from", getEmailFrom()),
    getPlatformSetting("email_reply_to", getEmailReplyTo() ?? ""),
  ]);
  return { apiKey, from, replyTo: replyTo || undefined };
}

export type SendEmailResult =
  | { sent: true }
  | { sent: false; skipped?: true; error?: string };

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  /** Sobrescreve o reply-to padrão (ex.: e-mail do admin que convidou). */
  replyTo?: string;
};

/**
 * Envia um e-mail transacional via Resend. É deliberadamente tolerante a falhas:
 * em modo mock ou sem `RESEND_API_KEY` vira no-op, e qualquer erro de envio é
 * registrado e devolvido — NUNCA lançado — para não derrubar o fluxo de negócio
 * que o disparou (criar usuário, assinar plano, processar webhook).
 */
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: SendEmailArgs): Promise<SendEmailResult> {
  if (env.useMocks) return { sent: false, skipped: true };

  const { apiKey, from, replyTo: defaultReplyTo } = await resolveEmailConfig();
  if (!apiKey) return { sent: false, skipped: true };

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject,
      react,
      replyTo: replyTo ?? defaultReplyTo,
    });
    if (error) {
      console.error("[email] Resend recusou o envio:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] Erro inesperado ao enviar:", e);
    return { sent: false, error: (e as Error).message };
  }
}
