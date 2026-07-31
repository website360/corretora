/**
 * Baixa o logo de cada seguradora do site oficial dela e hospeda no NOSSO
 * Supabase Storage, substituindo as URLs do Clearbit (serviço descontinuado —
 * todas as imagens dele falham hoje).
 *
 * Por que isso importa: com o logo quebrado, o CarrierLogo caía num fallback
 * que pedia o ícone ao `google.com/s2/favicons`. Dezenas de requisições por
 * tela, por usuário, todas do mesmo IP do escritório — o Google passou a
 * responder com o desafio "I'm not a robot".
 *
 * Só mexe no catálogo padrão (`default_carriers`): a função
 * `app.seed_default_carriers` propaga o logo para todas as empresas.
 *
 * Uso:
 *   node scripts/carrier-logos.mjs           (simulação — não grava nada)
 *   node scripts/carrier-logos.mjs --apply   (grava de verdade)
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

function loadEnvLocal() {
  const map = {};
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local */
  }
  return map;
}

const env = loadEnvLocal();
const pick = (k) => process.env[k] || env[k];

const DB_URL = pick("SUPABASE_DB_URL");
const SB_URL = pick("NEXT_PUBLIC_SUPABASE_URL");
const SB_KEY = pick("SUPABASE_SERVICE_ROLE_KEY");

if (!DB_URL || !SB_URL || !SB_KEY) {
  console.error("Faltam SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const BUCKET = "avatars";
// Mesmo prefixo que o upload manual da tela de seguradoras usa.
const PREFIX = "carriers";
// Alguns sites bloqueiam requisições sem cara de navegador.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const slug = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Maior dimensão declarada em sizes="180x180" (0 quando ausente). */
function sizeOf(tag) {
  const m = tag.match(/sizes=["']?(\d+)x(\d+)/i);
  return m ? Number(m[1]) : 0;
}

/**
 * Descobre o melhor ícone do site: percorre os <link rel="...icon">, prefere o
 * de maior resolução declarada, e cai nos caminhos convencionais se não achar.
 */
async function findIconUrls(siteUrl) {
  const urls = [];
  try {
    const res = await fetch(siteUrl, { headers: { "user-agent": UA }, redirect: "follow" });
    if (res.ok) {
      const html = await res.text();
      const tags = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi) ?? [];
      const found = tags
        .map((tag) => {
          const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
          if (!href) return null;
          // apple-touch-icon costuma ser 180px+, bem melhor que o favicon.
          const bonus = /apple-touch-icon/i.test(tag) ? 180 : 0;
          return { url: new URL(href, res.url).href, score: Math.max(sizeOf(tag), bonus) };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);
      urls.push(...found.map((f) => f.url));
    }
  } catch {
    /* site fora do ar ou bloqueando — cai nos convencionais abaixo */
  }
  const base = new URL(siteUrl).origin;
  urls.push(`${base}/apple-touch-icon.png`, `${base}/favicon.ico`);
  return [...new Set(urls)];
}

/** Baixa a primeira URL que devolver uma imagem de verdade. */
async function downloadIcon(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      // Abaixo disso costuma ser pixel transparente ou página de erro.
      if (buf.length < 100) continue;
      return { buf, type, url };
    } catch {
      /* tenta a próxima */
    }
  }
  return null;
}

const extFor = (type) =>
  ({
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
  })[type.split(";")[0].trim()] ?? "png";

async function main() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { rows } = await db.query(
    `select id, name, website from public.default_carriers
      where logo_url like '%clearbit%' order by name`,
  );

  console.log(`\n${rows.length} seguradora(s) com logo quebrado (Clearbit).`);
  console.log(APPLY ? "Modo: GRAVANDO\n" : "Modo: SIMULACAO (use --apply para gravar)\n");

  const failed = [];
  let ok = 0;

  for (const c of rows) {
    let site = c.website;
    // A coluna website tem lixo em alguns registros (mensagem de erro gravada
    // por engano); nesses casos não dá para descobrir o site.
    if (!site || !/^https?:\/\//i.test(site)) {
      console.log(`  ✗ ${c.name} — site inválido: ${String(site).slice(0, 40)}`);
      failed.push(c.name);
      continue;
    }

    const icon = await downloadIcon(await findIconUrls(site));
    if (!icon) {
      console.log(`  ✗ ${c.name} — nenhum ícone encontrado em ${site}`);
      failed.push(c.name);
      continue;
    }

    const path = `${PREFIX}/${slug(c.name)}.${extFor(icon.type)}`;
    const kb = Math.round(icon.buf.length / 1024);

    if (!APPLY) {
      console.log(`  · ${c.name} — ${kb}KB de ${icon.url}  →  ${path}`);
      ok++;
      continue;
    }

    const up = await sb.storage
      .from(BUCKET)
      .upload(path, icon.buf, { contentType: icon.type, upsert: true, cacheControl: "86400" });
    if (up.error) {
      console.log(`  ✗ ${c.name} — falha no upload: ${up.error.message}`);
      failed.push(c.name);
      continue;
    }

    const publicUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    await db.query(`update public.default_carriers set logo_url = $1 where id = $2`, [
      publicUrl,
      c.id,
    ]);
    console.log(`  ✓ ${c.name} — ${kb}KB  →  ${path}`);
    ok++;
  }

  if (APPLY && ok > 0) {
    // Propaga o catálogo padrão para as seguradoras de todas as empresas.
    await db.query(`do $$ declare c record; begin
      for c in select id from public.companies loop
        perform app.seed_default_carriers(c.id);
      end loop;
    end $$;`);
    console.log("\n✓ Logos propagados para as seguradoras de todas as empresas.");
  }

  console.log(`\nResumo: ${ok} ok, ${failed.length} falha(s).`);
  if (failed.length) {
    console.log(`Subir manualmente em Catálogo › Seguradoras: ${failed.join(", ")}`);
  }

  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
