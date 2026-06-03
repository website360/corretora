/**
 * Direct SQL runner for the project's Supabase Postgres.
 *
 * Reads SUPABASE_DB_URL from the environment or .env.local and executes the
 * given .sql file(s) in order. Used to apply migrations without pasting SQL
 * into the dashboard.
 *
 * Usage:
 *   node scripts/db.mjs supabase/migrations/0003_task_stages.sql
 *   node scripts/db.mjs "select count(*) from public.tickets;"   (inline SQL)
 */
import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";

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
const url = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;

if (!url) {
  console.error(
    "✗ SUPABASE_DB_URL não encontrado. Adicione a connection string do Supabase ao .env.local.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/db.mjs <arquivo.sql | SQL inline> [...]");
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const arg of args) {
    const sql = existsSync(arg) ? readFileSync(arg, "utf8") : arg;
    const label = existsSync(arg) ? arg : "(inline)";
    console.log(`\n▶ Executando ${label} ...`);
    const res = await client.query(sql);
    if (Array.isArray(res)) {
      console.log(`✓ ${label} — ${res.length} comandos`);
    } else if (res.rows?.length) {
      console.table(res.rows);
    } else {
      console.log(`✓ ${label} aplicado`);
    }
  }
} catch (e) {
  console.error("✗ Erro:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
