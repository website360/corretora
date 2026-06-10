/**
 * Eventos de mensagem ao cliente, por CANAL (e-mail HTML + WhatsApp texto).
 * Os padrões vivem aqui (editáveis pela empresa, que salva overrides na tabela
 * email_templates por evento×canal). Variáveis {{...}} são trocadas pelo motor.
 */
export type MessageChannel = "email" | "whatsapp";

export type EmailEvent =
  | "lead_created"
  | "quote_sent"
  | "contract_created"
  | "renewal_reminder";

export interface EventDef {
  event: EmailEvent;
  name: string;
  vars: string[];
  email: { subject: string; html: string };
  whatsapp: { text: string };
}

const COMMON_VARS = [
  "cliente.nome",
  "cliente.primeiro_nome",
  "cliente.email",
  "cliente.telefone",
  "corretora.nome",
  "corretora.telefone",
  "responsavel.nome",
];
const POLICY_VARS = [
  "apolice.numero",
  "apolice.produto",
  "apolice.seguradora",
  "apolice.inicio",
  "apolice.fim",
  "apolice.premio",
];

export const DEFAULT_EMAIL_TEMPLATES: EventDef[] = [
  {
    event: "lead_created",
    name: "Boas-vindas (novo contato)",
    vars: COMMON_VARS,
    email: {
      subject: "Recebemos seu contato — {{corretora.nome}}",
      html:
        "<p>Olá, {{cliente.primeiro_nome}}!</p>" +
        "<p>Recebemos seu contato e em breve um especialista vai falar com você.</p>" +
        "<p>Obrigado,<br/>{{corretora.nome}}</p>",
    },
    whatsapp: {
      text:
        "Olá, {{cliente.primeiro_nome}}! 👋\n\nRecebemos seu contato e em breve falamos com você.\n\n{{corretora.nome}}",
    },
  },
  {
    event: "quote_sent",
    name: "Cotação enviada",
    vars: [...COMMON_VARS, "orcamento.produto", "orcamento.valor"],
    email: {
      subject: "Sua cotação de {{orcamento.produto}} — {{corretora.nome}}",
      html:
        "<p>Olá, {{cliente.primeiro_nome}}!</p>" +
        "<p>Segue a sua cotação de <strong>{{orcamento.produto}}</strong>.</p>" +
        "<p>Valor: <strong>{{orcamento.valor}}</strong></p>" +
        "<p>Fico à disposição para seguir com a contratação.<br/>{{responsavel.nome}} — {{corretora.nome}}</p>",
    },
    whatsapp: {
      text:
        "Olá, {{cliente.primeiro_nome}}! Segue sua cotação de *{{orcamento.produto}}*: {{orcamento.valor}}.\n\nPosso seguir com a contratação? — {{responsavel.nome}}",
    },
  },
  {
    event: "contract_created",
    name: "Apólice emitida",
    vars: [...COMMON_VARS, ...POLICY_VARS],
    email: {
      subject: "Sua apólice {{apolice.numero}} — {{corretora.nome}}",
      html:
        "<p>Olá, {{cliente.primeiro_nome}}!</p>" +
        "<p>Sua apólice foi emitida. Confira os dados:</p>" +
        "<ul>" +
        "<li>Produto: {{apolice.produto}}</li>" +
        "<li>Seguradora: {{apolice.seguradora}}</li>" +
        "<li>Apólice nº: <strong>{{apolice.numero}}</strong></li>" +
        "<li>Vigência: {{apolice.inicio}} a {{apolice.fim}}</li>" +
        "<li>Prêmio: {{apolice.premio}}</li>" +
        "</ul>" +
        "<p>Qualquer dúvida, conte com a gente.<br/>{{corretora.nome}}</p>",
    },
    whatsapp: {
      text:
        "Olá, {{cliente.primeiro_nome}}! ✅ Sua apólice *{{apolice.numero}}* ({{apolice.produto}} — {{apolice.seguradora}}) foi emitida.\nVigência: {{apolice.inicio}} a {{apolice.fim}}.\n\n{{corretora.nome}}",
    },
  },
  {
    event: "renewal_reminder",
    name: "Lembrete de renovação",
    vars: [...COMMON_VARS, ...POLICY_VARS],
    email: {
      subject: "Sua apólice {{apolice.numero}} está perto de vencer",
      html:
        "<p>Olá, {{cliente.primeiro_nome}}!</p>" +
        "<p>Sua apólice de {{apolice.produto}} ({{apolice.seguradora}}) vence em <strong>{{apolice.fim}}</strong>. Vamos renovar?</p>" +
        "<p>Fale com a gente para manter sua proteção sem interrupção.<br/>{{corretora.nome}}</p>",
    },
    whatsapp: {
      text:
        "Olá, {{cliente.primeiro_nome}}! ⏰ Sua apólice *{{apolice.numero}}* ({{apolice.produto}}) vence em {{apolice.fim}}. Vamos renovar?\n\n{{corretora.nome}}",
    },
  },
];

export const EMAIL_EVENT_META: Record<EmailEvent, { label: string; description: string }> = {
  lead_created: { label: "Novo lead/contato", description: "Ao capturar um lead ou criar um contato." },
  quote_sent: { label: "Orçamento enviado", description: "Ao marcar um orçamento como enviado." },
  contract_created: { label: "Apólice/contrato criado", description: "Ao emitir uma nova apólice." },
  renewal_reminder: { label: "Renovação próxima", description: "Dias antes do vencimento da apólice." },
};

export function defaultTemplate(event: EmailEvent): EventDef {
  return DEFAULT_EMAIL_TEMPLATES.find((t) => t.event === event) ?? DEFAULT_EMAIL_TEMPLATES[0]!;
}

/** Substitui {{chave}} pelos valores (chaves planas como "cliente.nome"). */
export function renderTemplateText(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}
