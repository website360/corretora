// Creates (or promotes) a super_admin user. Password is read from SA_PASS so it
// is never written to the repo.
//   SA_PASS='...' node scripts/create-superadmin.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

const EMAIL = "contato@agenciamay.com.br";
const NAME = "Agência May";

function loadEnv() {
  const txt = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SA_PASS;
if (!url || !key) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
if (!password) throw new Error("Defina SA_PASS com a senha.");

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) throw listErr;
let user = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

if (user) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
  console.log("✓ Auth: usuário existente — senha redefinida.", user.id);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password,
    email_confirm: true,
    user_metadata: { name: NAME, role: "super_admin", company: NAME },
  });
  if (error) throw error;
  user = data.user;
  console.log("✓ Auth: usuário criado.", user.id);
}

// Ensure the public.users profile exists and has role super_admin.
const { data: prof } = await admin
  .from("users")
  .select("id, company_id, role")
  .eq("id", user.id)
  .maybeSingle();

if (prof) {
  if (prof.role !== "super_admin") {
    const { error } = await admin.from("users").update({ role: "super_admin" }).eq("id", user.id);
    if (error) throw error;
  }
  console.log("✓ Perfil: role=super_admin, company_id=" + prof.company_id);
} else {
  const { data: company, error: cErr } = await admin
    .from("companies")
    .insert({
      legal_name: NAME,
      trade_name: NAME,
      cnpj: "pendente-" + user.id.slice(0, 8),
      email: EMAIL,
      phone: "",
    })
    .select("id")
    .single();
  if (cErr) throw cErr;
  const { error: uErr } = await admin
    .from("users")
    .insert({ id: user.id, company_id: company.id, name: NAME, email: EMAIL, role: "super_admin" });
  if (uErr) throw uErr;
  console.log("✓ Perfil criado, company_id=" + company.id);
}

console.log("Pronto. Login:", EMAIL);
