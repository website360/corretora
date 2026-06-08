import * as React from "react";
import type { User } from "@/types/domain";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Monta um regex que casa "@Nome do Usuário" para os usuários conhecidos.
 * Nomes mais longos primeiro (a alternância tenta da esquerda p/ direita), e
 * `(?!\w)` evita casar um nome que é prefixo de outro (ex.: @Ana em @Anabela).
 */
function buildMentionRegex(users: Pick<User, "name">[]): RegExp | null {
  const names = users
    .map((u) => u.name)
    .filter((n): n is string => Boolean(n && n.trim()))
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (names.length === 0) return null;
  return new RegExp(`@(${names.join("|")})(?!\\w)`, "g");
}

/** IDs dos usuários efetivamente mencionados no texto. */
export function extractMentionIds(text: string, users: User[]): string[] {
  const re = buildMentionRegex(users);
  if (!re) return [];
  const idByName = new Map<string, string>();
  for (const u of users) if (u.name && !idByName.has(u.name)) idByName.set(u.name, u.id);
  const ids = new Set<string>();
  for (const m of text.matchAll(re)) {
    const id = idByName.get(m[1]!);
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Renderiza o texto destacando as menções "@Nome" dos usuários conhecidos.
 * Retorna nós React (mantém quebras de linha quando usado dentro de um
 * elemento com `whitespace-pre-wrap`).
 */
export function renderWithMentions(text: string, users: User[]): React.ReactNode {
  const re = buildMentionRegex(users);
  if (!re) return text;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    nodes.push(
      <span
        key={start}
        className="rounded bg-primary/10 px-1 font-medium text-primary"
      >
        {m[0]}
      </span>,
    );
    last = start + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
