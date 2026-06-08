import type { PeriodMode } from "@/modules/tickets/tasks-calendar";

/**
 * Persistência (por usuário, em localStorage) dos filtros da tela
 * "Tarefas & Agenda". O salvamento é EXPLÍCITO — só grava quando o usuário
 * clica em "Salvar"; ao voltar à página, restauramos o que foi salvo.
 */
export interface SavedTaskFilters {
  search: string;
  priorities: string[];
  relations: string[];
  personIds: string[];
  tagFilter: string[];
  boardFilter: string[];
  hideClosed: boolean;
  subjectFilter: string[];
  entryTypes: string[];
  periodMode: PeriodMode;
  rangeFrom: string;
  rangeTo: string;
}

const KEY_PREFIX = "corretora:task-filters:";

function keyFor(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

export function loadTaskFilters(userId: string): SavedTaskFilters | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as SavedTaskFilters) : null;
  } catch {
    return null;
  }
}

export function saveTaskFilters(userId: string, filters: SavedTaskFilters) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(filters));
  } catch {
    /* localStorage indisponível (modo privado / quota) — ignora. */
  }
}

export function clearTaskFilters(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignora */
  }
}
