"use client";

import * as React from "react";
import { create } from "zustand";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getViewCompanyId } from "@/services/lookup";
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
    // Escopo da empresa: usuário comum vê a sua; super_admin respeita o filtro
    // global (null = todas as empresas → diretório de todo o sistema).
    const co = getViewCompanyId();
    (async () => {
      try {
        const q = {
          users: sb.from("users").select("*"),
          customers: sb.from("customers").select("*"),
          companies: sb.from("companies").select("*"),
          stages: sb.from("task_stages").select("*"),
          carriers: sb.from("insurance_carriers").select("*").is("deleted_at", null),
          products: sb.from("insurance_products").select("*").is("deleted_at", null),
          boards: sb.from("task_boards").select("*"),
          columns: sb.from("task_columns").select("*"),
        };
        if (co) {
          q.users.eq("company_id", co);
          q.customers.eq("company_id", co);
          q.companies.eq("id", co);
          q.stages.eq("company_id", co);
          q.carriers.eq("company_id", co);
          q.products.eq("company_id", co);
          q.boards.eq("company_id", co);
          q.columns.eq("company_id", co);
        }
        const results = await Promise.all([
          q.users,
          q.customers,
          q.companies,
          q.stages.order("position"),
          q.carriers.order("name"),
          q.products.order("name"),
          q.boards.order("position"),
          q.columns.order("position"),
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
