/**
 * Rate limiting por janela deslizante, em memória.
 *
 * Escopo: o contador vive no processo. Com `instance_count: 1` no App Platform
 * (ver .do/app.yaml) isso cobre todo o tráfego. Se um dia houver mais de uma
 * instância, cada uma passa a ter seu próprio contador — nesse momento troque
 * o Map por Redis/Upstash mantendo a mesma assinatura de `rateLimit()`.
 *
 * Não substitui proteção de borda (Cloudflare). Serve para conter abuso barato:
 * flood de leads, força bruta em troca de senha, disparo repetido de e-mail.
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

/** Remove buckets ociosos para o Map não crescer sem limite. */
let lastSweep = 0;
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    const last = b.hits[b.hits.length - 1];
    if (last === undefined || now - last > windowMs * 2) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Requisições restantes na janela. */
  remaining: number;
  /** Segundos até liberar, quando bloqueado. */
  retryAfter: number;
};

/**
 * @param key    Identificador do cliente (IP, chave de API, id do usuário).
 * @param limit  Máximo de requisições na janela.
 * @param windowMs Tamanho da janela em milissegundos.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  // Descarta o que saiu da janela.
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0] ?? now;
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfter: 0 };
}

/**
 * IP do cliente. Atrás de Cloudflare + App Platform o valor confiável é o
 * primeiro item de `x-forwarded-for`; `cf-connecting-ip` tem precedência
 * quando presente.
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return (xff.split(",")[0] ?? xff).trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Resposta 429 pronta, com Retry-After. */
export function tooManyRequests(retryAfter: number, extraHeaders?: Record<string, string>) {
  return Response.json(
    { error: "Muitas requisições. Tente novamente em instantes." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter), ...(extraHeaders ?? {}) },
    },
  );
}
