/**
 * Changelog do sistema — "O que há de novo".
 *
 * Lista das versões/atualizações mostradas em /ajuda/novidades. A entrada mais
 * recente fica SEMPRE no topo (a ordem do array é do mais novo para o mais
 * antigo). Ao publicar uma atualização relevante, adicione uma entrada aqui.
 */

export type ChangeType = "new" | "improvement" | "fix";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  /** Rótulo da versão, ex.: "1.2.0". */
  version: string;
  /** Data de publicação (ISO, AAAA-MM-DD). */
  date: string;
  /** Título curto do que essa versão trouxe. */
  title: string;
  items: ChangeItem[];
}

/** `tone` casa com as variantes do componente Badge. */
export const CHANGE_TYPE_META: Record<ChangeType, { label: string; tone: "success" | "default" | "warning" }> = {
  new: { label: "Novo", tone: "success" },
  improvement: { label: "Melhoria", tone: "default" },
  fix: { label: "Correção", tone: "warning" },
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "2026-07-08",
    title: "Sinistros",
    items: [
      {
        type: "new",
        text:
          "Nova área de Sinistros: registre e acompanhe os sinistros dos clientes, com status (Solicitado, Em análise, Aprovado, Negado, Pago, Encerrado), valor e vínculo opcional com a apólice.",
      },
      {
        type: "new",
        text:
          "O cliente pode solicitar a abertura de um sinistro direto pelo Portal do Cliente — a solicitação chega para a corretora como “Solicitado”.",
      },
      {
        type: "new",
        text:
          "Os sinistros aparecem no perfil do cliente (aba Sinistros) e na página do contrato (Sinistros desta apólice).",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-07-03",
    title: "Recuperação de leads perdidos",
    items: [
      {
        type: "new",
        text:
          "Ao arrastar um lead para “Perdido”, o sistema pergunta se você quer criar uma tarefa para retomar o contato mais adiante e tentar recuperá-lo.",
      },
      {
        type: "new",
        text: "Novo tipo de tarefa “Lead”, para organizar e filtrar as tarefas ligadas a leads.",
      },
      {
        type: "improvement",
        text: "O formulário de tarefas passou a ter um seletor de Tipo (Interna, Cliente, Lead, Seguradora).",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-07-03",
    title: "Funil de leads mais completo",
    items: [
      {
        type: "new",
        text:
          "Agora é possível excluir leads pelo funil, pela ficha do lead ou pela lista (incluindo exclusão em massa). Tudo vai para a Lixeira, com restauração em até 5 dias.",
      },
      {
        type: "improvement",
        text:
          "As colunas “Novo”, “Ganho” e “Perdido” do funil ficaram fixas e não podem mais ser removidas por engano.",
      },
      {
        type: "improvement",
        text: "Acesso rápido aos atendimentos e conversas direto da ficha do lead.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-01",
    title: "Lançamento da plataforma",
    items: [
      {
        type: "new",
        text: "CRM completo: contatos, funil de leads (Kanban), orçamentos, contratos/apólices e tarefas.",
      },
      { type: "new", text: "Portal do cliente para acompanhar apólices e documentos." },
      { type: "new", text: "App instalável (PWA) no computador e no celular." },
      { type: "new", text: "Marca própria (white-label): logotipo e cor da sua corretora." },
    ],
  },
];

/** Versão atual (a entrada mais recente do changelog). */
export const CURRENT_VERSION = CHANGELOG[0]?.version ?? "";
