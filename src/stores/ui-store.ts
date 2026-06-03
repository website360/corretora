import { create } from "zustand";

export type TaskView = "board" | "list" | "calendar";
export type CalendarMode = "day" | "week" | "month";

interface UIState {
  commandOpen: boolean;
  sidebarCollapsed: boolean;
  taskView: TaskView;
  calendarMode: CalendarMode;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  toggleSidebar: () => void;
  setTaskView: (view: TaskView) => void;
  setCalendarMode: (mode: CalendarMode) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  sidebarCollapsed: false,
  taskView: "list",
  calendarMode: "month",
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTaskView: (taskView) => set({ taskView }),
  setCalendarMode: (calendarMode) => set({ calendarMode }),
}));
