-- Mirror the task "subject type" on calendar events: classify an event as
-- internal | customer | carrier | product and optionally link a customer,
-- an insurance carrier and a product together. Reuses the ticket_subject_type
-- enum created in 0025.

alter table public.calendar_events
  add column if not exists subject_type ticket_subject_type not null default 'internal',
  add column if not exists carrier_id uuid references public.insurance_carriers (id) on delete set null,
  add column if not exists product_id uuid references public.insurance_products (id) on delete set null;

create index if not exists calendar_events_carrier_idx on public.calendar_events (carrier_id);
create index if not exists calendar_events_product_idx on public.calendar_events (product_id);
