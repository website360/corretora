-- ───────────────────────── customer kind (lead | client) ──────────────────────
-- Segments contacts into leads and clients. Existing rows are treated as clients.
create type customer_kind as enum ('lead', 'client');

alter table public.customers
  add column kind customer_kind not null default 'client';

create index customers_kind_idx on public.customers (company_id, kind);
