-- Task "subject type" (tipo de tarefa) + entity links.
-- A task is classified as one of: internal | customer | carrier | product, and
-- may optionally link a customer, an insurance carrier and a product together.

do $$ begin
  create type ticket_subject_type as enum ('internal', 'customer', 'carrier', 'product');
exception when duplicate_object then null; end $$;

alter table public.tickets
  add column if not exists subject_type ticket_subject_type not null default 'internal',
  add column if not exists carrier_id uuid references public.insurance_carriers (id) on delete set null,
  add column if not exists product_id uuid references public.insurance_products (id) on delete set null;

create index if not exists tickets_carrier_idx on public.tickets (carrier_id);
create index if not exists tickets_product_idx on public.tickets (product_id);
