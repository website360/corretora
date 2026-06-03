import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Customizable columns for the unified Tasks & Agenda list. */
export const LIST_COLUMNS = [
  { id: "type", label: "Tipo" },
  { id: "id", label: "ID" },
  { id: "title", label: "Título" },
  { id: "priority", label: "Prioridade" },
  { id: "link", label: "Vínculo" },
  { id: "when", label: "Data" },
  { id: "tags", label: "Etiquetas" },
  { id: "stage", label: "Etapa" },
  { id: "owner", label: "Responsável" },
] as const;

export type ListColumnId = (typeof LIST_COLUMNS)[number]["id"];

/** Columns pinned as the first two — cannot be reordered or hidden. */
export const LOCKED_COLUMNS: ListColumnId[] = ["type", "id"];
export const isLockedColumn = (id: ListColumnId) => LOCKED_COLUMNS.includes(id);

const DEFAULT_ORDER = LIST_COLUMNS.map((c) => c.id) as ListColumnId[];

/** Keep the locked columns pinned at the front, in their fixed order. */
function pinLocked(order: ListColumnId[]): ListColumnId[] {
  return [...LOCKED_COLUMNS, ...order.filter((id) => !isLockedColumn(id))];
}

interface ListColumnsState {
  order: ListColumnId[];
  hidden: ListColumnId[];
  toggle: (id: ListColumnId) => void;
  reorder: (order: ListColumnId[]) => void;
  reset: () => void;
}

export const useListColumnsStore = create<ListColumnsState>()(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      hidden: [],
      toggle: (id) =>
        set((s) =>
          isLockedColumn(id)
            ? s
            : {
                hidden: s.hidden.includes(id)
                  ? s.hidden.filter((x) => x !== id)
                  : [...s.hidden, id],
              },
        ),
      reorder: (order) => set({ order: pinLocked(order) }),
      reset: () => set({ order: DEFAULT_ORDER, hidden: [] }),
    }),
    {
      name: "agenda-list-columns-v4",
      // Heal against added/removed columns across versions.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ListColumnsState>;
        const order = [
          ...(p.order ?? []).filter((id) => DEFAULT_ORDER.includes(id)),
          ...DEFAULT_ORDER.filter((id) => !(p.order ?? []).includes(id)),
        ];
        return { ...current, order, hidden: p.hidden ?? [] };
      },
    },
  ),
);
