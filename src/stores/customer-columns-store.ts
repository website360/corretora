import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Customizable columns for the Contacts list. */
export const CUSTOMER_COLUMNS = [
  { id: "name", label: "Contato" },
  { id: "contact", label: "E-mail / Telefone" },
  { id: "tags", label: "Etiquetas" },
  { id: "owner", label: "Responsável" },
  { id: "status", label: "Status" },
] as const;

export type CustomerColumnId = (typeof CUSTOMER_COLUMNS)[number]["id"];

/** Identity column pinned first — cannot be reordered or hidden. */
export const LOCKED_CUSTOMER_COLUMNS: CustomerColumnId[] = ["name"];
export const isLockedCustomerColumn = (id: CustomerColumnId) =>
  LOCKED_CUSTOMER_COLUMNS.includes(id);

const DEFAULT_ORDER = CUSTOMER_COLUMNS.map((c) => c.id) as CustomerColumnId[];

/** Keep the locked columns pinned at the front, in their fixed order. */
function pinLocked(order: CustomerColumnId[]): CustomerColumnId[] {
  return [...LOCKED_CUSTOMER_COLUMNS, ...order.filter((id) => !isLockedCustomerColumn(id))];
}

interface CustomerColumnsState {
  order: CustomerColumnId[];
  hidden: CustomerColumnId[];
  toggle: (id: CustomerColumnId) => void;
  reorder: (order: CustomerColumnId[]) => void;
  reset: () => void;
}

export const useCustomerColumnsStore = create<CustomerColumnsState>()(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      hidden: [],
      toggle: (id) =>
        set((s) =>
          isLockedCustomerColumn(id)
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
      name: "contacts-list-columns-v1",
      // Heal against added/removed columns across versions.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CustomerColumnsState>;
        const order = [
          ...(p.order ?? []).filter((id) => DEFAULT_ORDER.includes(id)),
          ...DEFAULT_ORDER.filter((id) => !(p.order ?? []).includes(id)),
        ];
        return { ...current, order, hidden: p.hidden ?? [] };
      },
    },
  ),
);
