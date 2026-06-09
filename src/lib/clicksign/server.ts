/**
 * ClickSign API client — SERVER ONLY (digital signatures).
 *
 * Per-company credentials (token + environment) live in
 * `companies.settings.integrations.clicksign`. Targets the ClickSign REST API
 * v1 (https://developers.clicksign.com).
 */
import crypto from "node:crypto";

export interface ClickSignConfig {
  apiToken: string;
  environment: "sandbox" | "production";
}

const BASE = {
  sandbox: "https://sandbox.clicksign.com",
  production: "https://app.clicksign.com",
};

function baseUrl(cfg: ClickSignConfig) {
  return BASE[cfg.environment] ?? BASE.sandbox;
}

async function csFetch<T>(cfg: ClickSignConfig, path: string, init: RequestInit): Promise<T> {
  const url = `${baseUrl(cfg)}/api/v1${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(cfg.apiToken)}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errors = (json?.errors as unknown[] | undefined) ?? [];
    // ClickSign returns errors as an array of strings or {message}. Surface a
    // clean, human-readable message (e.g. the "e-mail do usuário da API" hint).
    const clean =
      Array.isArray(errors) && errors.length
        ? errors
            .map((e) =>
              typeof e === "string" ? e : ((e as { message?: string })?.message ?? JSON.stringify(e)),
            )
            .join(" · ")
        : typeof json?.message === "string"
          ? json.message
          : `erro ${res.status}`;
    throw new Error(`ClickSign (HTTP ${res.status}): ${clean}`);
  }
  return json as T;
}

export interface CsDocument {
  key: string;
  status?: string; // running | closed | canceled
  signed_file_url?: string | null;
  downloads?: { signed_file_url?: string | null };
  finished_at?: string | null;
}

/** Uploads a PDF (base64) and returns the created document. */
export async function uploadDocument(
  cfg: ClickSignConfig,
  input: { name: string; contentBase64: string; deadlineAt?: string | null },
): Promise<CsDocument> {
  const content = input.contentBase64.startsWith("data:")
    ? input.contentBase64
    : `data:application/pdf;base64,${input.contentBase64}`;
  const json = await csFetch<{ document: CsDocument }>(cfg, "/documents", {
    method: "POST",
    body: JSON.stringify({
      document: {
        path: `/${input.name.replace(/[^\w.\-]+/g, "_")}`,
        content_base64: content,
        deadline_at: input.deadlineAt ?? undefined,
        auto_close: true,
        locale: "pt-BR",
        sequence_enabled: false,
      },
    }),
  });
  return json.document;
}

/** Creates a signer (party that must sign). */
export async function createSigner(
  cfg: ClickSignConfig,
  input: { name: string; email: string; documentation?: string | null },
): Promise<string> {
  const json = await csFetch<{ signer: { key: string } }>(cfg, "/signers", {
    method: "POST",
    body: JSON.stringify({
      signer: {
        name: input.name,
        email: input.email,
        documentation: input.documentation || undefined,
        auths: ["email"],
        delivery: "email",
      },
    }),
  });
  return json.signer.key;
}

/** Links a signer to a document (so ClickSign requests their signature). */
export async function addSignerToDocument(
  cfg: ClickSignConfig,
  input: { documentKey: string; signerKey: string; signAs?: string; message?: string },
): Promise<void> {
  await csFetch(cfg, "/lists", {
    method: "POST",
    body: JSON.stringify({
      list: {
        document_key: input.documentKey,
        signer_key: input.signerKey,
        sign_as: input.signAs ?? "party",
        message: input.message,
      },
    }),
  });
}

/**
 * Chamada autenticada leve para validar token + ambiente (sem criar nada).
 * Sucesso => credenciais OK; o erro do "e-mail do usuário da API" só aparece no
 * envio (criação da lista), confirmando que o bloqueio é a config da conta.
 */
export async function pingAccount(cfg: ClickSignConfig): Promise<void> {
  await csFetch(cfg, "/documents", { method: "GET" });
}

export async function getDocument(cfg: ClickSignConfig, key: string): Promise<CsDocument> {
  const json = await csFetch<{ document: CsDocument }>(cfg, `/documents/${key}`, { method: "GET" });
  return json.document;
}

/** A document is considered signed once ClickSign closes it. */
export function isSigned(doc: CsDocument): boolean {
  return doc.status === "closed";
}

export function signedUrl(doc: CsDocument): string | null {
  return doc.downloads?.signed_file_url ?? doc.signed_file_url ?? null;
}

/** Verifies the ClickSign webhook HMAC (header "Content-Hmac": "sha256=<hex>"). */
export function verifyWebhookHmac(secret: string, rawBody: string, header: string | null): boolean {
  if (!secret || !header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}
