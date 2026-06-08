/**
 * Asaas API client — SERVER ONLY.
 *
 * Configure via env (.env.local):
 *   ASAAS_API_KEY=...                      # your Asaas API key
 *   ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3   # or https://api.asaas.com/v3 (prod)
 *   ASAAS_WEBHOOK_TOKEN=...                # shared secret for the webhook
 *
 * Docs: https://docs.asaas.com
 */

import "server-only";
import { getPlatformSetting } from "@/lib/platform-settings/server";

const DEFAULT_BASE = "https://sandbox.asaas.com/api/v3";

/** Chave Asaas efetiva: banco (admin) sobrescreve, env é fallback. */
function resolveKey() {
  return getPlatformSetting("asaas_api_key", process.env.ASAAS_API_KEY ?? "");
}

export async function asaasConfigured(): Promise<boolean> {
  return Boolean(await resolveKey());
}

async function config() {
  const [key, base] = await Promise.all([
    resolveKey(),
    getPlatformSetting("asaas_base_url", process.env.ASAAS_BASE_URL ?? ""),
  ]);
  if (!key) throw new Error("ASAAS_API_KEY não configurada.");
  const baseUrl = (base || DEFAULT_BASE).replace(/\/$/, "");
  return { key, baseUrl };
}

async function asaasFetch<T>(path: string, init: RequestInit): Promise<T> {
  const { key, baseUrl } = await config();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errors = (json?.errors as { description?: string }[] | undefined) ?? [];
    const msg = errors.map((e) => e.description).filter(Boolean).join("; ");
    throw new Error(msg || `Asaas error ${res.status}`);
  }
  return json as T;
}

export interface AsaasPayment {
  id: string;
  value: number;
  status: string;
  dueDate: string;
  paymentDate: string | null;
  billingType: string;
  invoiceUrl: string | null;
  description: string | null;
}

/** Lists charges for a subscription (preferred) or a customer. */
export async function listPayments(opts: {
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<AsaasPayment[]> {
  const params = new URLSearchParams({ limit: "50" });
  if (opts.subscriptionId) params.set("subscription", opts.subscriptionId);
  else if (opts.customerId) params.set("customer", opts.customerId);
  else return [];
  const json = await asaasFetch<{ data?: AsaasPayment[] }>(`/payments?${params.toString()}`, {
    method: "GET",
  });
  return json.data ?? [];
}

export interface AsaasHolder {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface AsaasCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export async function findOrCreateCustomer(
  existingId: string | null,
  holder: AsaasHolder,
): Promise<string> {
  if (existingId) return existingId;
  const customer = await asaasFetch<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: holder.name,
      email: holder.email,
      cpfCnpj: holder.cpfCnpj.replace(/\D/g, ""),
      mobilePhone: holder.phone.replace(/\D/g, ""),
      postalCode: holder.postalCode.replace(/\D/g, ""),
      addressNumber: holder.addressNumber,
    }),
  });
  return customer.id;
}

export interface CreateSubscriptionInput {
  customerId: string;
  valueCents: number;
  nextDueDate: string; // YYYY-MM-DD (trial end → first charge after the trial)
  description: string;
  card: AsaasCard;
  holder: AsaasHolder;
  remoteIp: string;
}

export interface AsaasSubscription {
  id: string;
  creditCard?: {
    creditCardNumber?: string;
    creditCardBrand?: string;
    creditCardToken?: string;
  };
}

/** Creates a MONTHLY credit-card subscription; first charge on `nextDueDate`. */
export async function createCardSubscription(
  input: CreateSubscriptionInput,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "CREDIT_CARD",
      cycle: "MONTHLY",
      value: input.valueCents / 100,
      nextDueDate: input.nextDueDate,
      description: input.description,
      creditCard: {
        holderName: input.card.holderName,
        number: input.card.number.replace(/\s/g, ""),
        expiryMonth: input.card.expiryMonth,
        expiryYear: input.card.expiryYear,
        ccv: input.card.ccv,
      },
      creditCardHolderInfo: {
        name: input.holder.name,
        email: input.holder.email,
        cpfCnpj: input.holder.cpfCnpj.replace(/\D/g, ""),
        postalCode: input.holder.postalCode.replace(/\D/g, ""),
        addressNumber: input.holder.addressNumber,
        phone: input.holder.phone.replace(/\D/g, ""),
      },
      remoteIp: input.remoteIp,
    }),
  });
}

export interface TokenizedCard {
  token: string;
  last4: string | null;
  brand: string | null;
}

/** Tokenizes a credit card for reuse (multiple cards, default selection). */
export async function tokenizeCard(input: {
  customerId: string;
  card: AsaasCard;
  holder: AsaasHolder;
  remoteIp: string;
}): Promise<TokenizedCard> {
  const json = await asaasFetch<{
    creditCardToken: string;
    creditCardNumber?: string;
    creditCardBrand?: string;
  }>("/creditCard/tokenizeCreditCard", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      creditCard: {
        holderName: input.card.holderName,
        number: input.card.number.replace(/\s/g, ""),
        expiryMonth: input.card.expiryMonth,
        expiryYear: input.card.expiryYear,
        ccv: input.card.ccv,
      },
      creditCardHolderInfo: {
        name: input.holder.name,
        email: input.holder.email,
        cpfCnpj: input.holder.cpfCnpj.replace(/\D/g, ""),
        postalCode: input.holder.postalCode.replace(/\D/g, ""),
        addressNumber: input.holder.addressNumber,
        phone: input.holder.phone.replace(/\D/g, ""),
      },
      remoteIp: input.remoteIp,
    }),
  });
  return {
    token: json.creditCardToken,
    last4: json.creditCardNumber ?? null,
    brand: json.creditCardBrand ?? null,
  };
}

/** Creates a MONTHLY subscription using a previously tokenized card. */
export async function createSubscriptionWithToken(input: {
  customerId: string;
  valueCents: number;
  nextDueDate: string;
  description: string;
  creditCardToken: string;
  remoteIp: string;
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "CREDIT_CARD",
      cycle: "MONTHLY",
      value: input.valueCents / 100,
      nextDueDate: input.nextDueDate,
      description: input.description,
      creditCardToken: input.creditCardToken,
      remoteIp: input.remoteIp,
    }),
  });
}

/** Points an existing subscription at a different tokenized card. */
export async function updateSubscriptionCard(
  subscriptionId: string,
  creditCardToken: string,
): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, {
    method: "POST",
    body: JSON.stringify({ creditCardToken }),
  });
}
