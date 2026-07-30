import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getCurrentUserId } from "@/services/lookup";
import { ticketsService } from "@/services/tickets.service";
import { sleep, uid } from "@/lib/utils";
import type {
  ChecklistProgress,
  TaskChecklist,
  TaskChecklistItem,
  TaskChecklistWithItems,
} from "@/types/domain";

const mockChecklists: TaskChecklist[] = [];
const mockItems: TaskChecklistItem[] = [];

const byPosition = <T extends { position: number; created_at: string }>(a: T, b: T) =>
  a.position - b.position || +new Date(a.created_at) - +new Date(b.created_at);

/** Próxima posição livre numa lista já ordenada. */
function nextPosition(list: { position: number }[]): number {
  return list.length === 0 ? 0 : Math.max(...list.map((x) => x.position)) + 1;
}

export const checklistsService = {
  /** Checklists da tarefa, já com os itens aninhados e ordenados. */
  async list(ticketId: string): Promise<TaskChecklistWithItems[]> {
    if (env.useMocks) {
      await sleep(160);
      return mockChecklists
        .filter((c) => c.ticket_id === ticketId)
        .sort(byPosition)
        .map((c) => ({
          ...c,
          items: mockItems.filter((i) => i.checklist_id === c.id).sort(byPosition),
        }));
    }
    const sb = getSupabaseBrowserClient();
    const [lists, items] = await Promise.all([
      sb.from("task_checklists").select("*").eq("ticket_id", ticketId).order("position"),
      sb.from("task_checklist_items").select("*").eq("ticket_id", ticketId).order("position"),
    ]);
    if (lists.error) throw lists.error;
    if (items.error) throw items.error;
    const all = (items.data as TaskChecklistItem[]) ?? [];
    return ((lists.data as TaskChecklist[]) ?? []).map((c) => ({
      ...c,
      items: all.filter((i) => i.checklist_id === c.id),
    }));
  },

  /**
   * Progresso (concluídos/total) de várias tarefas numa query só — usado pelos
   * cartões do kanban. Tarefas sem checklist ficam de fora do mapa.
   */
  async progressFor(ticketIds: string[]): Promise<Record<string, ChecklistProgress>> {
    const out: Record<string, ChecklistProgress> = {};
    if (ticketIds.length === 0) return out;
    const tally = (rows: { ticket_id: string; done: boolean }[]) => {
      for (const r of rows) {
        const acc = (out[r.ticket_id] ??= { done: 0, total: 0 });
        acc.total += 1;
        if (r.done) acc.done += 1;
      }
      return out;
    };
    if (env.useMocks) {
      await sleep(80);
      return tally(mockItems.filter((i) => ticketIds.includes(i.ticket_id)));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("task_checklist_items")
      .select("ticket_id, done")
      .in("ticket_id", ticketIds);
    if (error) throw error;
    return tally((data as { ticket_id: string; done: boolean }[]) ?? []);
  },

  /* ───────────────────────────── checklists ──────────────────────────── */

  async createChecklist(ticketId: string, title: string): Promise<TaskChecklist> {
    const company_id = getCurrentCompanyId();
    const me = getCurrentUserId();
    if (env.useMocks) {
      await sleep(180);
      const record: TaskChecklist = {
        id: uid("tcl"),
        company_id,
        ticket_id: ticketId,
        title,
        position: nextPosition(mockChecklists.filter((c) => c.ticket_id === ticketId)),
        created_by: me || null,
        created_at: new Date().toISOString(),
      };
      mockChecklists.push(record);
      await ticketsService.logEvent(ticketId, "checklist_added", { title });
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data: siblings } = await sb
      .from("task_checklists")
      .select("position")
      .eq("ticket_id", ticketId);
    const { data, error } = await sb
      .from("task_checklists")
      .insert({
        company_id,
        ticket_id: ticketId,
        title,
        position: nextPosition((siblings as { position: number }[]) ?? []),
        created_by: me || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    await ticketsService.logEvent(ticketId, "checklist_added", { title });
    return data as TaskChecklist;
  },

  async renameChecklist(id: string, title: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const c = mockChecklists.find((x) => x.id === id);
      if (c) c.title = title;
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_checklists").update({ title }).eq("id", id);
    if (error) throw error;
  },

  /** Remove o checklist e, em cascata, todos os seus itens. */
  async removeChecklist(id: string, ticketId: string, title: string): Promise<void> {
    if (env.useMocks) {
      await sleep(160);
      const i = mockChecklists.findIndex((c) => c.id === id);
      if (i !== -1) mockChecklists.splice(i, 1);
      for (let k = mockItems.length - 1; k >= 0; k--) {
        if (mockItems[k]!.checklist_id === id) mockItems.splice(k, 1);
      }
      await ticketsService.logEvent(ticketId, "checklist_removed", { title });
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_checklists").delete().eq("id", id);
    if (error) throw error;
    await ticketsService.logEvent(ticketId, "checklist_removed", { title });
  },

  /* ─────────────────────────────── itens ─────────────────────────────── */

  async addItem(
    checklistId: string,
    ticketId: string,
    content: string,
  ): Promise<TaskChecklistItem> {
    const company_id = getCurrentCompanyId();
    if (env.useMocks) {
      await sleep(140);
      const record: TaskChecklistItem = {
        id: uid("tci"),
        company_id,
        checklist_id: checklistId,
        ticket_id: ticketId,
        content,
        done: false,
        done_at: null,
        done_by: null,
        position: nextPosition(mockItems.filter((i) => i.checklist_id === checklistId)),
        created_at: new Date().toISOString(),
      };
      mockItems.push(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data: siblings } = await sb
      .from("task_checklist_items")
      .select("position")
      .eq("checklist_id", checklistId);
    const { data, error } = await sb
      .from("task_checklist_items")
      .insert({
        company_id,
        checklist_id: checklistId,
        ticket_id: ticketId,
        content,
        position: nextPosition((siblings as { position: number }[]) ?? []),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as TaskChecklistItem;
  },

  async toggleItem(item: TaskChecklistItem, done: boolean): Promise<void> {
    const me = getCurrentUserId();
    const patch = {
      done,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? me || null : null,
    };
    const log = () =>
      ticketsService.logEvent(
        item.ticket_id,
        done ? "checklist_item_done" : "checklist_item_undone",
        { item: item.content },
      );
    if (env.useMocks) {
      await sleep(100);
      const found = mockItems.find((i) => i.id === item.id);
      if (found) Object.assign(found, patch);
      await log();
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_checklist_items").update(patch).eq("id", item.id);
    if (error) throw error;
    await log();
  },

  async renameItem(id: string, content: string): Promise<void> {
    if (env.useMocks) {
      await sleep(100);
      const i = mockItems.find((x) => x.id === id);
      if (i) i.content = content;
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_checklist_items").update({ content }).eq("id", id);
    if (error) throw error;
  },

  async removeItem(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const i = mockItems.findIndex((x) => x.id === id);
      if (i !== -1) mockItems.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_checklist_items").delete().eq("id", id);
    if (error) throw error;
  },

  /** Grava a nova ordem dos itens de um checklist (após arrastar). */
  async reorderItems(ids: string[]): Promise<void> {
    if (env.useMocks) {
      await sleep(80);
      ids.forEach((id, position) => {
        const i = mockItems.find((x) => x.id === id);
        if (i) i.position = position;
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await Promise.all(
      ids.map((id, position) =>
        sb.from("task_checklist_items").update({ position }).eq("id", id),
      ),
    );
  },
};
