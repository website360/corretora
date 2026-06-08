import "server-only";
import { sendEmail, type SendEmailResult } from "./client";
import { TeamInviteEmail } from "./templates/team-invite";
import { BillingWelcomeEmail } from "./templates/billing-welcome";
import { PaymentFailedEmail } from "./templates/payment-failed";
import { PortalInviteEmail } from "./templates/portal-invite";

/** Convite de equipe: novo membro define a própria senha e entra. */
export function sendTeamInviteEmail(args: {
  to: string;
  name: string;
  setPasswordUrl: string;
  inviterName?: string;
  companyName?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: args.to,
    subject: `Você foi convidado para a equipe${args.companyName ? ` da ${args.companyName}` : ""}`,
    replyTo: args.replyTo,
    react: TeamInviteEmail({
      name: args.name,
      inviterName: args.inviterName,
      companyName: args.companyName,
      setPasswordUrl: args.setPasswordUrl,
    }),
  });
}

/** Boas-vindas após a escolha/ativação de um plano. */
export function sendBillingWelcomeEmail(args: {
  to: string;
  planName: string;
  manageUrl: string;
  name?: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: args.to,
    subject: `Plano ${args.planName} ativado 🎉`,
    react: BillingWelcomeEmail({
      name: args.name,
      planName: args.planName,
      manageUrl: args.manageUrl,
    }),
  });
}

/** Convite de acesso ao portal do cliente. */
export function sendPortalInviteEmail(args: {
  to: string;
  name: string;
  setPasswordUrl: string;
  loginUrl: string;
  companyName?: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: args.to,
    subject: `Seu acesso ao portal${args.companyName ? ` da ${args.companyName}` : ""}`,
    react: PortalInviteEmail({
      name: args.name,
      companyName: args.companyName,
      setPasswordUrl: args.setPasswordUrl,
      loginUrl: args.loginUrl,
    }),
  });
}

/** Aviso de falha/atraso de pagamento, com link para regularizar. */
export function sendPaymentFailedEmail(args: {
  to: string | string[];
  manageUrl: string;
  companyName?: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: args.to,
    subject: "Não conseguimos processar seu pagamento",
    react: PaymentFailedEmail({
      companyName: args.companyName,
      manageUrl: args.manageUrl,
    }),
  });
}
