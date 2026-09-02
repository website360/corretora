import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

/** Valor antes/depois de uma coluna. `masked` marca segredo (gravado como ***). */
export interface AuditChange {
  from: unknown;
  to: unknown;
  masked?: boolean;
}

export interface AuditLog {
  id: number;
  company_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  record_label: string | null;
  changes: Record<string, AuditChange>;
  created_at: string;
}

export interface AuditFilters {
  /** uuid da empresa, ou "all". */
  companyId?: string;
  /** yyyy-MM-dd, inclusivo, no fuso do navegador. */
  from?: string;
  to?: string;
  actorId?: string;
  action?: AuditAction | "all";
  table?: string;
  search?: string;
  /** Paginação por chave: traz só os registros anteriores a este id. */
  before?: number;
  limit?: number;
}

export const AUDIT_PAGE_SIZE = 50;

/** Início do dia local em ISO/UTC — o log é timestamptz. */
function dayStart(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}
function dayEnd(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

/** Escapa o que quebraria a sintaxe do filtro `or` do PostgREST. */
function safeTerm(term: string) {
  return term.trim().replace(/[%,().*\\]/g, " ").trim();
}

export const auditService = {
  /** Página de registros, do mais recente para o mais antigo. */
  async list(filters: AuditFilters = {}): Promise<AuditLog[]> {
    if (env.useMocks) return [];
    const sb = getSupabaseBrowserClient();
    let query = sb
      .from("audit_logs")
      .select("*")
      .order("id", { ascending: false })
      .limit(filters.limit ?? AUDIT_PAGE_SIZE);

    if (filters.companyId && filters.companyId !== "all") {
      query = query.eq("company_id", filters.companyId);
    }
    if (filters.from) query = query.gte("created_at", dayStart(filters.from));
    if (filters.to) query = query.lte("created_at", dayEnd(filters.to));
    if (filters.actorId && filters.actorId !== "all") {
      query = query.eq("actor_id", filters.actorId);
    }
    if (filters.action && filters.action !== "all") query = query.eq("action", filters.action);
    if (filters.table && filters.table !== "all") query = query.eq("table_name", filters.table);
    if (filters.before) query = query.lt("id", filters.before);

    const term = safeTerm(filters.search ?? "");
    if (term) {
      query = query.or(
        `actor_name.ilike.%${term}%,actor_email.ilike.%${term}%,` +
          `record_label.ilike.%${term}%,record_id.ilike.%${term}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as AuditLog[]) ?? [];
  },

  /** Total de registros no log (para a confirmação da limpeza). */
  async total(): Promise<number> {
    if (env.useMocks) return 0;
    const sb = getSupabaseBrowserClient();
    const { count, error } = await sb
      .from("audit_logs")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },

  /**
   * Apaga o log inteiro e grava, como primeiro registro do log novo, quem
   * limpou e quantos registros foram removidos. Devolve o total apagado.
   */
  async purge(): Promise<number> {
    if (env.useMocks) return 0;
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.rpc("audit_purge");
    if (error) throw error;
    return Number(data ?? 0);
  },
};
