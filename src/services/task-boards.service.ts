import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { StageColor, TaskBoard, TaskColumn } from "@/types/domain";

const now = () => new Date().toISOString();

// Minimal mock store (the app runs against Supabase; mocks keep dev parity).
const mockBoards: TaskBoard[] = [
  { id: "tb_default", company_id: "co_apex", name: "Tarefas", description: "Quadro padrão de tarefas", position: 0, is_default: true, created_at: now() },
];
const mockColumns: TaskColumn[] = [
  { id: "tc_aberto", company_id: "co_apex", board_id: "tb_default", name: "Aberto", color: "primary", position: 0, is_terminal: false, created_at: now() },
  { id: "tc_andamento", company_id: "co_apex", board_id: "tb_default", name: "Em andamento", color: "warning", position: 1, is_terminal: false, created_at: now() },
  { id: "tc_concluido", company_id: "co_apex", board_id: "tb_default", name: "Concluído", color: "success", position: 2, is_terminal: true, created_at: now() },
];

const DEFAULT_COLUMNS: { name: string; color: StageColor; is_terminal: boolean }[] = [
  { name: "Aberto", color: "primary", is_terminal: false },
  { name: "Em andamento", color: "warning", is_terminal: false },
  { name: "Concluído", color: "success", is_terminal: true },
];

export const taskBoardsService = {
  /* ───────────────────────────── boards ───────────────────────────── */
  async listBoards(): Promise<TaskBoard[]> {
    if (env.useMocks) {
      await sleep(100);
      return [...mockBoards].sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("task_boards").select("*").order("position");
    if (error) throw error;
    return (data as TaskBoard[]) ?? [];
  },

  async createBoard(name: string, description?: string | null): Promise<TaskBoard> {
    if (env.useMocks) {
      await sleep(160);
      const board: TaskBoard = {
        id: uid("tb"),
        company_id: getCurrentCompanyId() || "co_apex",
        name,
        description: description ?? null,
        position: Math.max(-1, ...mockBoards.map((b) => b.position)) + 1,
        is_default: false,
        created_at: now(),
      };
      mockBoards.push(board);
      DEFAULT_COLUMNS.forEach((c, i) =>
        mockColumns.push({
          id: uid("tc"),
          company_id: board.company_id,
          board_id: board.id,
          name: c.name,
          color: c.color,
          position: i,
          is_terminal: c.is_terminal,
          created_at: now(),
        }),
      );
      return board;
    }
    const sb = getSupabaseBrowserClient();
    const company_id = getCurrentCompanyId();
    const { data: existing } = await sb.from("task_boards").select("position");
    const position = Math.max(-1, ...((existing as { position: number }[]) ?? []).map((b) => b.position)) + 1;
    const { data, error } = await sb
      .from("task_boards")
      .insert({ company_id, name, description: description ?? null, position, is_default: false })
      .select("*")
      .single();
    if (error) throw error;
    const board = data as TaskBoard;
    await sb.from("task_columns").insert(
      DEFAULT_COLUMNS.map((c, i) => ({
        company_id,
        board_id: board.id,
        name: c.name,
        color: c.color,
        position: i,
        is_terminal: c.is_terminal,
      })),
    );
    return board;
  },

  async updateBoard(id: string, patch: Partial<Pick<TaskBoard, "name" | "description">>): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const b = mockBoards.find((x) => x.id === id);
      if (b) Object.assign(b, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_boards").update(patch).eq("id", id);
    if (error) throw error;
  },

  async removeBoard(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(140);
      const i = mockBoards.findIndex((b) => b.id === id);
      if (i !== -1) mockBoards.splice(i, 1);
      for (let j = mockColumns.length - 1; j >= 0; j--) {
        if (mockColumns[j]!.board_id === id) mockColumns.splice(j, 1);
      }
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_boards").delete().eq("id", id);
    if (error) throw error;
  },

  /* ───────────────────────────── columns ──────────────────────────── */
  async listAllColumns(): Promise<TaskColumn[]> {
    if (env.useMocks) {
      await sleep(80);
      return [...mockColumns];
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("task_columns").select("*").order("position");
    if (error) throw error;
    return (data as TaskColumn[]) ?? [];
  },

  async createColumn(boardId: string, name: string, color: StageColor): Promise<TaskColumn> {
    if (env.useMocks) {
      await sleep(120);
      const siblings = mockColumns.filter((c) => c.board_id === boardId);
      const col: TaskColumn = {
        id: uid("tc"),
        company_id: getCurrentCompanyId() || "co_apex",
        board_id: boardId,
        name,
        color,
        position: Math.max(-1, ...siblings.map((c) => c.position)) + 1,
        is_terminal: false,
        created_at: now(),
      };
      mockColumns.push(col);
      return col;
    }
    const sb = getSupabaseBrowserClient();
    const { data: existing } = await sb.from("task_columns").select("position").eq("board_id", boardId);
    const position = Math.max(-1, ...((existing as { position: number }[]) ?? []).map((c) => c.position)) + 1;
    const { data, error } = await sb
      .from("task_columns")
      .insert({ company_id: getCurrentCompanyId(), board_id: boardId, name, color, position })
      .select("*")
      .single();
    if (error) throw error;
    return data as TaskColumn;
  },

  async updateColumn(
    id: string,
    patch: Partial<Pick<TaskColumn, "name" | "color" | "is_terminal">>,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(100);
      const c = mockColumns.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_columns").update(patch).eq("id", id);
    if (error) throw error;
  },

  /** Deletes a column, reassigning its tasks/events to the first remaining column of the board. */
  async removeColumn(id: string, boardId: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const i = mockColumns.findIndex((c) => c.id === id);
      if (i !== -1) mockColumns.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { data: siblings } = await sb
      .from("task_columns")
      .select("id")
      .eq("board_id", boardId)
      .neq("id", id)
      .order("position")
      .limit(1);
    const fallback = (siblings as { id: string }[] | null)?.[0]?.id ?? null;
    if (fallback) {
      await sb.from("tickets").update({ column_id: fallback }).eq("column_id", id);
      await sb.from("calendar_events").update({ column_id: fallback }).eq("column_id", id);
    }
    const { error } = await sb.from("task_columns").delete().eq("id", id);
    if (error) throw error;
  },

  async reorderColumns(orderedIds: string[]): Promise<void> {
    if (env.useMocks) {
      await sleep(60);
      orderedIds.forEach((id, i) => {
        const c = mockColumns.find((x) => x.id === id);
        if (c) c.position = i;
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await Promise.all(
      orderedIds.map((id, i) => sb.from("task_columns").update({ position: i }).eq("id", id)),
    );
  },

  /** Moves a task/event card to a column (within the same board). */
  async moveCard(
    kind: "task" | "event",
    id: string,
    boardId: string,
    columnId: string,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(60);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const table = kind === "task" ? "tickets" : "calendar_events";
    const { error } = await sb.from(table).update({ board_id: boardId, column_id: columnId }).eq("id", id);
    if (error) throw error;
  },
};
