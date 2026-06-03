/**
 * Server-side client for **Evolution Go** (https://github.com/evolution-foundation/evolution-go) —
 * a Go/whatsmeow WhatsApp gateway. NOTE: its API differs from the Node "Evolution API":
 *
 *  - Auth header is always `apikey`.
 *  - `POST /instance/create` is authenticated with the GLOBAL api key (admin).
 *  - `POST /instance/connect`, `GET /instance/qr`, `GET /instance/status` are authenticated
 *    with the per-instance TOKEN (the instance is resolved from the token, no id in the path).
 *
 * Config saved per company in `companies.settings.integrations.whatsapp.evolution`:
 *   { baseUrl, apiKey (global/admin), instance (name), token (per-instance) }
 */

export interface EvolutionConfig {
  baseUrl: string;
  /** Global/admin API key (server env GLOBAL_API_KEY) — used to create instances. */
  globalApiKey: string;
  /** Instance name. */
  instance: string;
  /** Per-instance token — used for connect/qr/status. */
  token: string;
}

export interface EvolutionQr {
  base64: string | null;
  code: string | null;
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function call(
  baseUrl: string,
  path: string,
  opts: { apikey?: string; method?: string; body?: unknown } = {},
): Promise<{ res: Response; json: any }> {
  const url = endpoint(baseUrl, path);
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apikey ? { apikey: opts.apikey } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(
      `Não foi possível acessar ${url} (${(e as Error).message}). ` +
        "Verifique se a URL do servidor está correta e acessível.",
    );
  }
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

function httpError(path: string, res: Response, json: any): Error {
  const detail = json?.error || json?.message || json?.raw || "";
  const snippet =
    typeof detail === "string" ? detail.slice(0, 200) : JSON.stringify(detail).slice(0, 200);
  if (res.status === 404) {
    return new Error(
      `Endpoint ${path} não encontrado (404). Confirme que a URL aponta para a RAIZ do ` +
        `servidor Evolution Go. ${snippet}`,
    );
  }
  if (res.status === 401) {
    return new Error(
      `Não autorizado (401) em ${path}. Confira a API Key global / o token da instância. ${snippet}`,
    );
  }
  return new Error(`Servidor respondeu ${res.status} em ${path}. ${snippet}`);
}

/** Confirms the URL really is an Evolution Go server (public health route). */
export async function ping(baseUrl: string): Promise<void> {
  const { res, json } = await call(baseUrl, `/server/ok`);
  if (!res.ok) throw httpError("/server/ok", res, json);
}

export interface EvolutionStatus {
  exists: boolean;
  connected: boolean;
}

/** Reads the instance connection status using its token. `exists:false` when the token is unknown. */
export async function getStatus(cfg: EvolutionConfig): Promise<EvolutionStatus> {
  const { res, json } = await call(cfg.baseUrl, `/instance/status`, { apikey: cfg.token });
  if (res.status === 401) return { exists: false, connected: false };
  if (!res.ok) throw httpError("/instance/status", res, json);
  const data = json?.data ?? {};
  const connected = Boolean(data.LoggedIn ?? data.loggedIn ?? data.Connected ?? data.connected);
  return { exists: true, connected };
}

/** Creates the instance (admin key). Idempotent: returns false if it already exists. */
export async function createInstance(cfg: EvolutionConfig): Promise<boolean> {
  const { res, json } = await call(cfg.baseUrl, `/instance/create`, {
    apikey: cfg.globalApiKey,
    method: "POST",
    body: { name: cfg.instance, token: cfg.token },
  });
  if (res.ok) return true;
  const msg = (json?.error || json?.message || "").toString();
  if (res.status === 409 || /already|exists|unique|duplicate/i.test(msg)) return false;
  throw httpError("/instance/create", res, json);
}

/** Starts the WhatsApp session (token auth); this triggers QR generation. */
export async function connect(cfg: EvolutionConfig): Promise<void> {
  const { res, json } = await call(cfg.baseUrl, `/instance/connect`, {
    apikey: cfg.token,
    method: "POST",
    body: { immediate: true },
  });
  if (!res.ok) throw httpError("/instance/connect", res, json);
}

/** Fetches the current QR code (token auth). `data.Qrcode` is base64; `data.Code` is the raw string. */
export async function getQr(cfg: EvolutionConfig): Promise<EvolutionQr | null> {
  const { res, json } = await call(cfg.baseUrl, `/instance/qr`, { apikey: cfg.token });
  if (!res.ok) throw httpError("/instance/qr", res, json);
  const data = json?.data ?? {};
  let base64: string | null = data.Qrcode ?? data.qrcode ?? null;
  const code: string | null = data.Code ?? data.code ?? null;
  if (base64 && !base64.startsWith("data:")) base64 = `data:image/png;base64,${base64}`;
  if (!base64 && !code) return null;
  return { base64, code };
}

/** Best-effort: reads the connected line (digits) from the admin instance list. */
export async function getNumber(cfg: EvolutionConfig): Promise<string | null> {
  const { res, json } = await call(cfg.baseUrl, `/instance/all`, { apikey: cfg.globalApiKey });
  if (!res.ok) return null;
  const list: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const found = list.find((i) => i?.name === cfg.instance || i?.Name === cfg.instance);
  const jid = found?.jid ?? found?.Jid ?? null;
  if (!jid) return null;
  const digits = String(jid).split(/[:@.]/)[0]?.replace(/\D/g, "");
  return digits || null;
}
