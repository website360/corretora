import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { taskStages as mockStages, tickets as mockTickets } from "@/services/mock/data";
import { getCurrentCompanyId } from "@/services/lookup";
import { useDirectoryStore } from "@/stores/directory-store";
import { sleep, uid } from "@/lib/utils";
import type { StageColor, TaskStage } from "@/types/domain";

function sortByPosition(stages: TaskStage[]) {
  return [...stages].sort((a, b) => a.position - b.position);
}

/** Stage names that cannot be edited, deleted or reordered. */
export const LOCKED_STAGE_NAMES = ["Início", "Fechado"];
export const isLockedStage = (name: string) => LOCKED_STAGE_NAMES.includes(name);

/** Ordered ids with `newId` placed right before the terminal "Fechado" stage. */
function orderWithBeforeFechado(stages: { id: string; name: string }[], newId: string): string[] {
  const ids = stages.filter((s) => s.id !== newId).map((s) => s.id);
  const fechado = stages.find((s) => s.name === "Fechado" && s.id !== newId);
  if (fechado) ids.splice(ids.indexOf(fechado.id), 0, newId);
  else ids.push(newId);
  return ids;
}

/** Refresh the directory store so every consumer re-renders. */
function syncStore(stages: TaskStage[]) {
  useDirectoryStore.getState().setStages(stages);
}

export const stagesService = {
  async list(): Promise<TaskStage[]> {
    if (env.useMocks) {
      await sleep(120);
      return sortByPosition(mockStages);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("task_stages").select("*").order("position");
    if (error) throw error;
    return (data as TaskStage[]) ?? [];
  },

  /** Creates a stage, inserting it right before the terminal "Fechado" stage. */
  async create(name: string, color: StageColor): Promise<TaskStage> {
    if (env.useMocks) {
      await sleep(200);
      const stage: TaskStage = {
        id: uid("st"),
        company_id: getCurrentCompanyId() || "co_apex",
        name,
        color,
        position: Math.max(-1, ...mockStages.map((s) => s.position)) + 1,
        is_terminal: false,
        created_at: new Date().toISOString(),
      };
      mockStages.push(stage);
      const ids = orderWithBeforeFechado(sortByPosition(mockStages), stage.id);
      await this.reorder(ids);
      return stage;
    }
    const sb = getSupabaseBrowserClient();
    const { data: existing } = await sb.from("task_stages").select("id,name,position").order("position");
    const stages = (existing as { id: string; name: string; position: number }[] | null) ?? [];
    const position = Math.max(-1, ...stages.map((s) => s.position)) + 1;
    const { data, error } = await sb
      .from("task_stages")
      .insert({ company_id: getCurrentCompanyId(), name, color, position })
      .select("*")
      .single();
    if (error) throw error;
    const created = data as TaskStage;
    await this.reorder(orderWithBeforeFechado([...stages, created], created.id));
    return created;
  },

  async update(id: string, patch: Partial<Pick<TaskStage, "name" | "color" | "is_terminal">>): Promise<void> {
    if (env.useMocks) {
      await sleep(160);
      const s = mockStages.find((x) => x.id === id);
      if (s) Object.assign(s, patch);
      syncStore(mockStages);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_stages").update(patch).eq("id", id);
    if (error) throw error;
    syncStore(await this.list());
  },

  /** Deletes a stage, reassigning its tasks to the first remaining stage. */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(200);
      const fallback = sortByPosition(mockStages).find((s) => s.id !== id);
      mockTickets.forEach((t) => {
        if (t.stage_id === id) t.stage_id = fallback?.id;
      });
      const idx = mockStages.findIndex((s) => s.id === id);
      if (idx !== -1) mockStages.splice(idx, 1);
      syncStore(mockStages);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const stages = await this.list();
    const fallback = stages.find((s) => s.id !== id);
    if (fallback) {
      await sb.from("tickets").update({ stage_id: fallback.id }).eq("stage_id", id);
    }
    const { error } = await sb.from("task_stages").delete().eq("id", id);
    if (error) throw error;
    syncStore(await this.list());
  },

  /** Persists a new column order (positions = array index). */
  async reorder(orderedIds: string[]): Promise<void> {
    if (env.useMocks) {
      await sleep(80);
      orderedIds.forEach((id, i) => {
        const s = mockStages.find((x) => x.id === id);
        if (s) s.position = i;
      });
      syncStore(mockStages);
      return;
    }
    const sb = getSupabaseBrowserClient();
    await Promise.all(
      orderedIds.map((id, i) => sb.from("task_stages").update({ position: i }).eq("id", id)),
    );
  },

  /** Moves a stage left/right by swapping positions with its neighbour. */
  async move(id: string, dir: "left" | "right"): Promise<void> {
    const ordered = sortByPosition(
      env.useMocks ? mockStages : useDirectoryStore.getState().stages,
    );
    const idx = ordered.findIndex((s) => s.id === id);
    const swapIdx = dir === "left" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= ordered.length) return;

    const a = ordered[idx]!;
    const b = ordered[swapIdx]!;

    if (env.useMocks) {
      await sleep(120);
      const pa = a.position;
      a.position = b.position;
      b.position = pa;
      const sa = mockStages.find((s) => s.id === a.id);
      const sb2 = mockStages.find((s) => s.id === b.id);
      if (sa) sa.position = a.position;
      if (sb2) sb2.position = b.position;
      syncStore(mockStages);
      return;
    }
    const sb = getSupabaseBrowserClient();
    await Promise.all([
      sb.from("task_stages").update({ position: b.position }).eq("id", a.id),
      sb.from("task_stages").update({ position: a.position }).eq("id", b.id),
    ]);
    syncStore(await this.list());
  },
};
