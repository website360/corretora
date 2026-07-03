import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getViewCompanyId, getWriteCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { KanbanBoard, KanbanColumn, StageColor } from "@/types/domain";

// In-memory store for mock mode.
const mockBoards: KanbanBoard[] = [
  {
    id: "kb_default",
    company_id: "co_apex",
    name: "Funil de Leads",
    description: "Pipeline padrão de captação de leads",
    position: 0,
    created_at: new Date().toISOString(),
  },
];
const mockColumns: KanbanColumn[] = [
  { id: "kc_novo", company_id: "co_apex", board_id: "kb_default", name: "Novo", color: "primary", slot: "new", position: 0, created_at: new Date().toISOString() },
  { id: "kc_contato", company_id: "co_apex", board_id: "kb_default", name: "Em contato", color: "warning", position: 1, created_at: new Date().toISOString() },
  { id: "kc_proposta", company_id: "co_apex", board_id: "kb_default", name: "Proposta", color: "neutral", position: 2, created_at: new Date().toISOString() },
  { id: "kc_ganho", company_id: "co_apex", board_id: "kb_default", name: "Ganho", color: "success", slot: "won", position: 3, created_at: new Date().toISOString() },
  { id: "kc_perdido", company_id: "co_apex", board_id: "kb_default", name: "Perdido", color: "destructive", slot: "lost", position: 4, created_at: new Date().toISOString() },
];

// The three anchors are fixed: Novo first, then Ganho/Perdido last.
const DEFAULT_COLUMNS: { name: string; color: StageColor; slot?: "new" | "won" | "lost" }[] = [
  { name: "Novo", color: "primary", slot: "new" },
  { name: "Em contato", color: "warning" },
  { name: "Ganho", color: "success", slot: "won" },
  { name: "Perdido", color: "destructive", slot: "lost" },
];

export const kanbanService = {
  /* ───────────────────────────── boards ───────────────────────────── */
  async listBoards(): Promise<KanbanBoard[]> {
    if (env.useMocks) {
      await sleep(120);
      return [...mockBoards].sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    let q = sb.from("kanban_boards").select("*").order("position");
    const co = getViewCompanyId();
    if (co) q = q.eq("company_id", co);
    const { data, error } = await q;
    if (error) throw error;
    return (data as KanbanBoard[]) ?? [];
  },

  /** Creates a board with a default set of columns. */
  async createBoard(name: string, description?: string | null): Promise<KanbanBoard> {
    if (env.useMocks) {
      await sleep(180);
      const board: KanbanBoard = {
        id: uid("kb"),
        company_id: getCurrentCompanyId() || "co_apex",
        name,
        description: description ?? null,
        position: Math.max(-1, ...mockBoards.map((b) => b.position)) + 1,
        created_at: new Date().toISOString(),
      };
      mockBoards.push(board);
      DEFAULT_COLUMNS.forEach((c, i) =>
        mockColumns.push({
          id: uid("kc"),
          company_id: board.company_id,
          board_id: board.id,
          name: c.name,
          color: c.color,
          slot: c.slot ?? null,
          position: i,
          created_at: new Date().toISOString(),
        }),
      );
      return board;
    }
    const sb = getSupabaseBrowserClient();
    const company_id = getWriteCompanyId();
    const { data: existing } = await sb.from("kanban_boards").select("position").eq("company_id", company_id);
    const position = Math.max(-1, ...((existing as { position: number }[]) ?? []).map((b) => b.position)) + 1;
    const { data, error } = await sb
      .from("kanban_boards")
      .insert({ company_id, name, description: description ?? null, position })
      .select("*")
      .single();
    if (error) throw error;
    const board = data as KanbanBoard;
    await sb.from("kanban_columns").insert(
      DEFAULT_COLUMNS.map((c, i) => ({
        company_id,
        board_id: board.id,
        name: c.name,
        color: c.color,
        slot: c.slot ?? null,
        position: i,
      })),
    );
    return board;
  },

  async updateBoard(id: string, patch: Partial<Pick<KanbanBoard, "name" | "description">>): Promise<void> {
    if (env.useMocks) {
      await sleep(140);
      const b = mockBoards.find((x) => x.id === id);
      if (b) Object.assign(b, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("kanban_boards").update(patch).eq("id", id);
    if (error) throw error;
  },

  async removeBoard(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(160);
      const i = mockBoards.findIndex((b) => b.id === id);
      if (i !== -1) mockBoards.splice(i, 1);
      for (let j = mockColumns.length - 1; j >= 0; j--) {
        if (mockColumns[j]!.board_id === id) mockColumns.splice(j, 1);
      }
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("kanban_boards").delete().eq("id", id);
    if (error) throw error;
  },

  /* ───────────────────────────── columns ──────────────────────────── */
  async listColumns(boardId: string): Promise<KanbanColumn[]> {
    if (env.useMocks) {
      await sleep(100);
      return mockColumns.filter((c) => c.board_id === boardId).sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("kanban_columns")
      .select("*")
      .eq("board_id", boardId)
      .order("position");
    if (error) throw error;
    return (data as KanbanColumn[]) ?? [];
  },

  /** All columns across every board (company-scoped) — used to resolve a lead's stage. */
  async listAllColumns(): Promise<KanbanColumn[]> {
    if (env.useMocks) {
      await sleep(80);
      return [...mockColumns];
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("kanban_columns").select("*").order("position");
    if (error) throw error;
    return (data as KanbanColumn[]) ?? [];
  },

  async createColumn(
    boardId: string,
    name: string,
    color: string,
    icon?: string | null,
  ): Promise<KanbanColumn> {
    // New columns always land BEFORE the fixed Ganho/Perdido pair.
    const isTerminal = (c: { slot?: string | null }) => c.slot === "won" || c.slot === "lost";

    if (env.useMocks) {
      await sleep(140);
      const siblings = mockColumns
        .filter((c) => c.board_id === boardId)
        .sort((a, b) => a.position - b.position);
      const terminals = siblings.filter(isTerminal);
      const insertPos = siblings.length - terminals.length;
      const col: KanbanColumn = {
        id: uid("kc"),
        company_id: getCurrentCompanyId() || "co_apex",
        board_id: boardId,
        name,
        color,
        icon: icon ?? null,
        slot: null,
        position: insertPos,
        created_at: new Date().toISOString(),
      };
      terminals.forEach((t, i) => (t.position = insertPos + 1 + i));
      mockColumns.push(col);
      return col;
    }
    const sb = getSupabaseBrowserClient();
    const { data: existing } = await sb
      .from("kanban_columns")
      .select("id, position, slot")
      .eq("board_id", boardId)
      .order("position");
    const cols = (existing as { id: string; position: number; slot: string | null }[]) ?? [];
    const terminals = cols.filter(isTerminal);
    const insertPos = cols.length - terminals.length;
    const { data, error } = await sb
      .from("kanban_columns")
      .insert({ company_id: getWriteCompanyId(), board_id: boardId, name, color, icon: icon ?? null, position: insertPos })
      .select("*")
      .single();
    if (error) throw error;
    // Push the fixed terminals back to the end so they stay last.
    await Promise.all(
      terminals.map((t, i) =>
        sb.from("kanban_columns").update({ position: insertPos + 1 + i }).eq("id", t.id),
      ),
    );
    return data as KanbanColumn;
  },

  async updateColumn(
    id: string,
    patch: Partial<Pick<KanbanColumn, "name" | "color" | "icon">>,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const c = mockColumns.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("kanban_columns").update(patch).eq("id", id);
    if (error) throw error;
  },

  async removeColumn(id: string): Promise<void> {
    const FIXED_MSG = "Este bloco é fixo do funil e não pode ser excluído.";
    if (env.useMocks) {
      await sleep(140);
      const i = mockColumns.findIndex((c) => c.id === id);
      if (i !== -1) {
        if (mockColumns[i]!.slot) throw new Error(FIXED_MSG);
        mockColumns.splice(i, 1);
      }
      return;
    }
    const sb = getSupabaseBrowserClient();
    // Guard: fixed anchors (Novo/Ganho/Perdido) can't be removed.
    const { data: col } = await sb.from("kanban_columns").select("slot").eq("id", id).single();
    if ((col as { slot: string | null } | null)?.slot) throw new Error(FIXED_MSG);
    const { error } = await sb.from("kanban_columns").delete().eq("id", id);
    if (error) throw error;
  },

  async reorderColumns(orderedIds: string[]): Promise<void> {
    if (env.useMocks) {
      await sleep(80);
      orderedIds.forEach((id, i) => {
        const c = mockColumns.find((x) => x.id === id);
        if (c) c.position = i;
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await Promise.all(
      orderedIds.map((id, i) => sb.from("kanban_columns").update({ position: i }).eq("id", id)),
    );
  },
};
