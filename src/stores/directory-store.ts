"use client";

import * as React from "react";
import { create } from "zustand";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
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
    const co = getCurrentCompanyId();
    (async () => {
      try {
        // Escopa à empresa atual: um super_admin "fura" o RLS (is_super_admin)
        // e veria dados de TODAS as empresas no app — aqui no app só a dele.
        const results = await Promise.all([
          sb.from("users").select("*").eq("company_id", co),
          sb.from("customers").select("*").eq("company_id", co),
          sb.from("companies").select("*").eq("id", co),
          sb.from("task_stages").select("*").eq("company_id", co).order("position"),
          sb
            .from("insurance_carriers")
            .select("*")
            .eq("company_id", co)
            .is("deleted_at", null)
            .order("name"),
          sb
            .from("insurance_products")
            .select("*")
            .eq("company_id", co)
            .is("deleted_at", null)
            .order("name"),
          sb.from("task_boards").select("*").eq("company_id", co).order("position"),
          sb.from("task_columns").select("*").eq("company_id", co).order("position"),
        ]);
        // If ANY query errored, don't cache a half-empty directory (which made
        // etapas/seguradoras "disappear"). Reset so the next mount retries.
        if (results.some((r) => r.error)) {
          useDirectoryStore.setState({ loading: false, loaded: false });
          return;
        }
        const [users, customers, companies, stages, carriers, products, boards, columns] = results;
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
      } catch {
        // Network/transient failure — allow a retry instead of staying stuck.
        useDirectoryStore.setState({ loading: false, loaded: false });
      }
    })();
  }, []);

  return state;
}
