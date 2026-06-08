-- 0044_platform_settings.sql
-- Configurações globais da PLATAFORMA (não de tenant): chaves de integração do
-- sistema como Resend e Asaas, editáveis pelo super-admin no /admin. O valor
-- salvo aqui sobrescreve a variável de ambiente correspondente (env vira
-- fallback). Tabela key-value singleton.

create table if not exists public.platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

-- RLS habilitado SEM policies: nenhum usuário de tenant (anon/authenticated)
-- consegue ler/escrever. Apenas o client service-role — que ignora RLS — tem
-- acesso, e ele só é usado em rotas server-side guardadas por super_admin.
alter table public.platform_settings enable row level security;
