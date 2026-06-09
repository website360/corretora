/**
 * Eventos de e-mail ao cliente e seus templates PADRÃO (editáveis pela empresa,
 * que salva overrides na tabela email_templates). O corpo é texto simples com
 * variáveis {{...}}; o motor troca pelas chaves planas (ex.: "cliente.nome").
 */
export type EmailEvent =
  | "lead_created"
  | "quote_sent"
  | "contract_created"
  | "renewal_reminder";

export interface EmailTemplateDef {
  event: EmailEvent;
  name: string;
  subject: string;
  body: string;
  /** Variáveis disponíveis neste evento (para mostrar no editor). */
  vars: string[];
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

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    event: "lead_created",
    name: "Boas-vindas (novo contato)",
    subject: "Recebemos seu contato — {{corretora.nome}}",
    body:
      "Olá, {{cliente.primeiro_nome}}!\n\n" +
      "Recebemos seu contato e em breve um especialista vai falar com você.\n\n" +
      "Obrigado,\n{{corretora.nome}}",
    vars: COMMON_VARS,
  },
  {
    event: "quote_sent",
    name: "Cotação enviada",
    subject: "Sua cotação de {{orcamento.produto}} — {{corretora.nome}}",
    body:
      "Olá, {{cliente.primeiro_nome}}!\n\n" +
      "Segue a sua cotação de {{orcamento.produto}}.\n" +
      "Valor: {{orcamento.valor}}\n\n" +
      "Fico à disposição para seguir com a contratação.\n" +
      "{{responsavel.nome}} — {{corretora.nome}}",
    vars: [...COMMON_VARS, "orcamento.produto", "orcamento.valor"],
  },
  {
    event: "contract_created",
    name: "Apólice emitida",
    subject: "Sua apólice {{apolice.numero}} — {{corretora.nome}}",
    body:
      "Olá, {{cliente.primeiro_nome}}!\n\n" +
      "Sua apólice foi emitida. Confira os dados:\n\n" +
      "Produto: {{apolice.produto}}\n" +
      "Seguradora: {{apolice.seguradora}}\n" +
      "Apólice nº: {{apolice.numero}}\n" +
      "Vigência: {{apolice.inicio}} a {{apolice.fim}}\n" +
      "Prêmio: {{apolice.premio}}\n\n" +
      "Qualquer dúvida, conte com a gente.\n{{corretora.nome}}",
    vars: [...COMMON_VARS, ...POLICY_VARS],
  },
  {
    event: "renewal_reminder",
    name: "Lembrete de renovação",
    subject: "Sua apólice {{apolice.numero}} está perto de vencer",
    body:
      "Olá, {{cliente.primeiro_nome}}!\n\n" +
      "Sua apólice de {{apolice.produto}} ({{apolice.seguradora}}) vence em {{apolice.fim}}. " +
      "Vamos renovar?\n\n" +
      "Fale com a gente para manter sua proteção sem interrupção.\n{{corretora.nome}}",
    vars: [...COMMON_VARS, ...POLICY_VARS],
  },
];

export const EMAIL_EVENT_META: Record<EmailEvent, { label: string; description: string }> = {
  lead_created: { label: "Novo lead/contato", description: "Ao capturar um lead ou criar um contato." },
  quote_sent: { label: "Orçamento enviado", description: "Ao marcar um orçamento como enviado." },
  contract_created: { label: "Apólice/contrato criado", description: "Ao emitir uma nova apólice." },
  renewal_reminder: { label: "Renovação próxima", description: "Dias antes do vencimento da apólice." },
};

export function defaultTemplate(event: EmailEvent): EmailTemplateDef {
  return DEFAULT_EMAIL_TEMPLATES.find((t) => t.event === event) ?? DEFAULT_EMAIL_TEMPLATES[0]!;
}

/** Substitui {{chave}} pelos valores (chaves planas como "cliente.nome"). */
export function renderTemplateText(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}
