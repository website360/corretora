-- ============================================================================
-- Atendimentos — registro de atendimentos ao cliente, por canal, opcionalmente
-- ligado a um produto. Ex.: "Atendi por WhatsApp e informei os dados do
-- seguro de vida."
-- ============================================================================

create table if not exists public.service_records (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id  uuid references public.insurance_products (id) on delete set null,
  channel     text not null default 'whatsapp',  -- whatsapp|phone|email|in_person|chat|sms|other
  notes       text not null default '',
  author_id   uuid references public.users (id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists service_company_idx  on public.service_records (company_id, created_at desc);
create index if not exists service_customer_idx on public.service_records (customer_id);
create index if not exists service_deleted_idx  on public.service_records (company_id, deleted_at) where deleted_at is not null;

alter table public.service_records enable row level security;
create policy "service: tenant read" on public.service_records for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "service: tenant manage" on public.service_records for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
