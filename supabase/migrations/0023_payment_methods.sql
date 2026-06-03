-- ============================================================================
-- Formas de pagamento — múltiplos cartões por empresa, com um padrão.
-- Cartões são tokenizados no Asaas; guardamos só o token + últimos 4 + bandeira.
-- ============================================================================

create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  asaas_token text not null,
  last4       text,
  brand       text,
  holder_name text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists payment_methods_company_idx on public.payment_methods (company_id);

alter table public.payment_methods enable row level security;
create policy "cards: tenant read" on public.payment_methods for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "cards: tenant manage" on public.payment_methods for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
