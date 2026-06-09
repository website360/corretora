-- 0067_email_templates.sql
-- Templates de e-mail ao cliente, por empresa. Os textos PADRÃO vivem em código
-- (src/config/email-templates.ts); aqui guardamos só as personalizações da
-- empresa (assunto/corpo editados), os flags (ativo / enviar por padrão) e os
-- templates CUSTOM criados pela corretora.

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- evento gatilho: lead_created | quote_sent | contract_created |
  -- renewal_reminder | custom
  event text not null,
  name text not null,
  subject text not null,
  body text not null,
  enabled boolean not null default true,
  -- enviar automaticamente no evento (padrão da empresa para o toggle da ação)
  auto_send boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists email_templates_company_idx
  on public.email_templates (company_id, event);

alter table public.email_templates enable row level security;

create policy "email_templates: tenant read" on public.email_templates for select
  using (company_id = app.current_company_id() or app.is_super_admin());

create policy "email_templates: tenant manage" on public.email_templates for all
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
