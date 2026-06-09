import { env } from "@/config/env";
import {
  CURRENT_COMPANY_ID,
  CURRENT_USER_ID,
  companies as mockCompanies,
  customers as mockCustomers,
  taskStages as mockStages,
  users as mockUsers,
} from "@/services/mock/data";
import { useDirectoryStore } from "@/stores/directory-store";
import { useSessionStore } from "@/stores/session-store";
import { useViewCompanyStore } from "@/stores/view-company-store";
import type {
  Carrier,
  Company,
  Customer,
  Product,
  SessionUser,
  TaskBoard,
  TaskColumn,
  TaskStage,
  User,
} from "@/types/domain";

/**
 * Synchronous entity helpers used inside client JSX. In mock mode they read
 * the static dataset; in real mode they read the live directory/session
 * stores (populated by `useDirectory()` and `SessionProvider`).
 */

export function getCurrentCompanyId() {
  if (env.useMocks) return CURRENT_COMPANY_ID;
  return useSessionStore.getState().companyId ?? "";
}

export function getCurrentUserId() {
  if (env.useMocks) return CURRENT_USER_ID;
  return useSessionStore.getState().userId ?? "";
}

/**
 * Empresa-escopo para os reads do app. Usuário comum: sua própria empresa.
 * Super Admin: respeita o filtro global (null = todas as empresas → sem
 * escopo, vê o sistema inteiro). Usado nas listas; os inserts continuam
 * usando `getCurrentCompanyId()`.
 */
export function getViewCompanyId(): string | null {
  if (env.useMocks) return getCurrentCompanyId();
  if (useSessionStore.getState().role === "super_admin") {
    return useViewCompanyStore.getState().companyId;
  }
  return getCurrentCompanyId();
}

export function findUser(id?: string | null): User | undefined {
  if (!id) return undefined;
  const source = env.useMocks ? mockUsers : useDirectoryStore.getState().users;
  return source.find((u) => u.id === id);
}

export function findCompany(id?: string | null): Company | undefined {
  if (!id) return undefined;
  const source = env.useMocks ? mockCompanies : useDirectoryStore.getState().companies;
  return source.find((c) => c.id === id);
}

export function findCustomer(id?: string | null): Customer | undefined {
  if (!id) return undefined;
  const source = env.useMocks ? mockCustomers : useDirectoryStore.getState().customers;
  return source.find((c) => c.id === id);
}

export function findStage(id?: string | null): TaskStage | undefined {
  if (!id) return undefined;
  const source = env.useMocks ? mockStages : useDirectoryStore.getState().stages;
  return source.find((s) => s.id === id);
}

export function findCarrier(id?: string | null): Carrier | undefined {
  if (!id) return undefined;
  return useDirectoryStore.getState().carriers.find((c) => c.id === id);
}

export function findProduct(id?: string | null): Product | undefined {
  if (!id) return undefined;
  return useDirectoryStore.getState().products.find((p) => p.id === id);
}

export function findTaskBoard(id?: string | null): TaskBoard | undefined {
  if (!id) return undefined;
  return useDirectoryStore.getState().taskBoards.find((b) => b.id === id);
}

export function findTaskColumn(id?: string | null): TaskColumn | undefined {
  if (!id) return undefined;
  return useDirectoryStore.getState().taskColumns.find((c) => c.id === id);
}

/** Mock-only synchronous session (used by the app layout in mock mode). */
export function getSessionUser(): SessionUser {
  const user = mockUsers.find((u) => u.id === CURRENT_USER_ID)!;
  const company = mockCompanies.find((c) => c.id === user.company_id)!;
  return { ...user, company };
}
