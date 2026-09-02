import type { IntegrationsSettings } from "@/types/domain";

/**
 * Segredos de integração nunca devem trafegar para o navegador.
 *
 * Em 2026-08 a auditoria encontrou senha SMTP, token do ClickSign, webhookSecret
 * e chave da API WordPress em texto puro no HTML da página — legíveis por
 * qualquer usuário logado, inclusive corretores sem privilégio.
 *
 * Aqui os valores salvos viram um marcador. O formulário mostra o marcador (o
 * usuário vê que está configurado), e ao salvar o servidor restaura o valor
 * original para todo campo que voltou com o marcador intacto — ver
 * `unmaskIntegrations`.
 */
export const SECRET_MASK = "••••••••";

/** Caminhos (a partir de `integrations`) dos campos que carregam segredo. */
const SECRET_PATHS: string[][] = [
  ["smtp", "password"],
  ["wordpress", "apiKey"],
  ["clicksign", "apiToken"],
  ["clicksign", "webhookSecret"],
  ["whatsapp", "evolution", "apiKey"],
  ["whatsapp", "evolution", "token"],
  ["whatsapp", "zapi", "token"],
  ["whatsapp", "zapi", "clientToken"],
  ["whatsapp", "meta", "accessToken"],
  ["whatsapp", "meta", "verifyToken"],
];

type AnyObj = Record<string, unknown>;

function getAt(obj: AnyObj | undefined, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as AnyObj)[k];
  }
  return cur;
}

/** Percorre até o penúltimo nível; devolve null se o ramo não existir. */
function parentOf(obj: AnyObj, path: string[]): { parent: AnyObj; leaf: string } | null {
  const leaf = path[path.length - 1];
  if (leaf === undefined) return null;
  let cur: AnyObj = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (k === undefined) return null;
    const next = cur[k];
    if (!next || typeof next !== "object") return null; // não cria ramo inexistente
    cur = next as AnyObj;
  }
  return { parent: cur, leaf };
}

function setAt(obj: AnyObj, path: string[], value: unknown): void {
  const at = parentOf(obj, path);
  if (at) at.parent[at.leaf] = value;
}

function deleteAt(obj: AnyObj, path: string[]): void {
  const at = parentOf(obj, path);
  if (at) delete at.parent[at.leaf];
}

/**
 * Troca cada segredo preenchido pelo marcador. Campo vazio continua vazio, para
 * o formulário conseguir distinguir "configurado" de "não configurado".
 */
export function maskIntegrations(
  integrations: IntegrationsSettings | undefined,
): IntegrationsSettings | undefined {
  if (!integrations) return integrations;
  const clone = structuredClone(integrations) as AnyObj;
  for (const path of SECRET_PATHS) {
    const v = getAt(clone, path);
    if (typeof v === "string" && v.length > 0) setAt(clone, path, SECRET_MASK);
  }
  return clone as IntegrationsSettings;
}

/**
 * Inverso do mask, aplicado no servidor ao gravar: todo campo que chegou com o
 * marcador (ou seja, o usuário não digitou nada novo) volta a ser o valor
 * guardado no banco. Sem isso, salvar uma integração apagaria os segredos das
 * outras — o cliente manda o objeto `integrations` inteiro.
 */
export function unmaskIntegrations(
  incoming: IntegrationsSettings | undefined,
  stored: IntegrationsSettings | undefined,
): IntegrationsSettings | undefined {
  if (!incoming) return incoming;
  const clone = structuredClone(incoming) as AnyObj;
  for (const path of SECRET_PATHS) {
    const v = getAt(clone, path);
    if (v !== SECRET_MASK) continue;
    const original = getAt(stored as AnyObj | undefined, path);
    if (typeof original === "string" && original.length > 0) setAt(clone, path, original);
    else deleteAt(clone, path);
  }
  return clone as IntegrationsSettings;
}
