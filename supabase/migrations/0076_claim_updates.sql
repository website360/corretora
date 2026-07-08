-- Acompanhamentos de um sinistro: log append-only de notas/atualizações que a
-- corretora vai registrando ao longo do andamento do sinistro.

create table if not exists public.claim_updates (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  claim_id   uuid not null references public.claims (id) on delete cascade,
  author_id  uuid references public.users (id) on delete set null,
  note       text not null,
  created_at timestamptz not null default now()
);
create index if not exists claim_updates_claim_idx on public.claim_updates (claim_id, created_at);

alter table public.claim_updates enable row level security;

create policy "claim_updates: tenant read" on public.claim_updates for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "claim_updates: tenant manage" on public.claim_updates for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
