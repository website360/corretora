import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Remembers the last board the user was on, per context ("leads", "tasks"),
 * so returning to a kanban lands on the same board.
 */
interface LastBoardState {
  boards: Record<string, string>;
  set: (key: string, id: string) => void;
}

export const useLastBoardStore = create<LastBoardState>()(
  persist(
    (set) => ({
      boards: {},
      set: (key, id) => set((s) => ({ boards: { ...s.boards, [key]: id } })),
    }),
    { name: "last-board-v1" },
  ),
);
