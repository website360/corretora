import "server-only";
import type { ReactElement } from "react";
import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { env } from "@/config/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SmtpIntegration } from "@/types/domain";
import { sendEmail, type SendEmailResult } from "./client";

export function isSmtpConfigured(s?: SmtpIntegration | null): s is SmtpIntegration {
  return !!(s && s.host && s.port && s.username && s.password && s.fromEmail);
}

/** Envia um e-mail HTML via SMTP (nodemailer). Lança em caso de falha. */
export async function sendViaSmtp(
  smtp: SmtpIntegration,
  args: { to: string | string[]; subject: string; html: string; replyTo?: string },
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port),
    secure: !!smtp.secure,
    auth: { user: smtp.username, pass: smtp.password },
    // Falha rápido em vez de pendurar quando a porta de saída está bloqueada.
    connectionTimeout: 12000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  const from = smtp.fromName ? `"${smtp.fromName}" <${smtp.fromEmail}>` : smtp.fromEmail!;
  await transporter.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    replyTo: args.replyTo,
  });
}

async function getCompanySmtp(companyId: string): Promise<SmtpIntegration | null> {
  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .maybeSingle();
    const smtp = (data?.settings as { integrations?: { smtp?: SmtpIntegration } } | null)
      ?.integrations?.smtp;
    return smtp ?? null;
  } catch {
    return null;
  }
}

/**
 * Envia usando o SMTP da empresa (se configurado); senão cai no Resend da
 * plataforma. Tolerante a falhas — nunca lança, para não derrubar o fluxo.
 */
export async function sendEmailForCompany(
  companyId: string,
  args: { to: string | string[]; subject: string; react: ReactElement; replyTo?: string },
): Promise<SendEmailResult> {
  if (env.useMocks) return { sent: false, skipped: true };
  const smtp = await getCompanySmtp(companyId);
  if (isSmtpConfigured(smtp)) {
    try {
      const html = await render(args.react);
      await sendViaSmtp(smtp, {
        to: args.to,
        subject: args.subject,
        html,
        replyTo: args.replyTo,
      });
      return { sent: true };
    } catch (e) {
      console.error("[email] SMTP da empresa falhou; tentando Resend:", e);
    }
  }
  return sendEmail(args);
}
