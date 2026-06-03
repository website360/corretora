"use client";

import * as React from "react";
import { create } from "zustand";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { taskStages as mockStages } from "@/services/mock/data";
import type {
  Carrier,
  Company,
  Customer,
  Product,
  TaskBoard,
  TaskColumn,
  TaskStage,
  User,
} from "@/types/domain";

/**
 * In-memory directory of the tenant's users / customers / companies / stages.
 *
 * It lets synchronous helpers (`findUser`, `findStage`) resolve related
 * entities by id inside JSX — the same ergonomics the mock layer offered —
 * but backed by live Supabase data when mocks are off.
 */
interface DirectoryState {
  users: User[];
  customers: Customer[];
  companies: Company[];
  stages: TaskStage[];
  carriers: Carrier[];
  products: Product[];
  taskBoards: TaskBoard[];
  taskColumns: TaskColumn[];
  loaded: boolean;
  loading: boolean;
  setData: (
    data: Partial<
      Pick<
        DirectoryState,
        | "users"
        | "customers"
        | "companies"
        | "stages"
        | "carriers"
        | "products"
        | "taskBoards"
        | "taskColumns"
      >
    >,
  ) => void;
  setStages: (stages: TaskStage[]) => void;
  refreshTaskBoards: () => Promise<void>;
  beginLoad: () => boolean;
  finishLoad: () => void;
}

export const useDirectoryStore = create<DirectoryState>((set, get) => ({
  users: [],
  customers: [],
  companies: [],
  stages: env.useMocks ? mockStages : [],
  carriers: [],
  products: [],
  taskBoards: [],
  taskColumns: [],
  loaded: false,
  loading: false,
  setData: (data) => set((s) => ({ ...s, ...data })),
  setStages: (stages) => set({ stages: [...stages].sort((a, b) => a.position - b.position) }),
  refreshTaskBoards: async () => {
    if (env.useMocks) return;
    const sb = getSupabaseBrowserClient();
    const [boards, columns] = await Promise.all([
      sb.from("task_boards").select("*").order("position"),
      sb.from("task_columns").select("*").order("position"),
    ]);
    set({
      taskBoards: (boards.data as TaskBoard[] | null) ?? [],
      taskColumns: (columns.data as TaskColumn[] | null) ?? [],
    });
  },
  beginLoad: () => {
    if (get().loading || get().loaded) return false;
    set({ loading: true });
    return true;
  },
  finishLoad: () => set({ loading: false, loaded: true }),
}));

/**
 * Subscribes the calling component to the directory and lazily loads it
 * (once) when running against a real Supabase backend.
 */
export function useDirectory() {
  const state = useDirectoryStore();

  React.useEffect(() => {
    if (env.useMocks) return;
    if (!useDirectoryStore.getState().beginLoad()) return;

    const sb = getSupabaseBrowserClient();
    (async () => {
      const [users, customers, companies, stages, carriers, products, boards, columns] =
        await Promise.all([
          sb.from("users").select("*"),
          sb.from("customers").select("*"),
          sb.from("companies").select("*"),
          sb.from("task_stages").select("*").order("position"),
          sb.from("insurance_carriers").select("*").is("deleted_at", null).order("name"),
          sb.from("insurance_products").select("*").is("deleted_at", null).order("name"),
          sb.from("task_boards").select("*").order("position"),
          sb.from("task_columns").select("*").order("position"),
        ]);
      useDirectoryStore.getState().setData({
        users: (users.data as User[] | null) ?? [],
        customers: (customers.data as Customer[] | null) ?? [],
        companies: (companies.data as Company[] | null) ?? [],
        stages: (stages.data as TaskStage[] | null) ?? [],
        carriers: (carriers.data as Carrier[] | null) ?? [],
        products: (products.data as Product[] | null) ?? [],
        taskBoards: (boards.data as TaskBoard[] | null) ?? [],
        taskColumns: (columns.data as TaskColumn[] | null) ?? [],
      });
      useDirectoryStore.getState().finishLoad();
    })();
  }, []);

  return state;
}
