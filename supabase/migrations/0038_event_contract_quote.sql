-- 0038_event_contract_quote.sql
-- Eventos também podem mencionar Contrato e Orçamento (além de cliente,
-- seguradora e produto).
alter table public.calendar_events
  add column if not exists contract_id uuid references public.contracts (id) on delete set null,
  add column if not exists quote_id    uuid references public.quotes (id)    on delete set null;

create index if not exists events_contract_idx on public.calendar_events (contract_id);
create index if not exists events_quote_idx    on public.calendar_events (quote_id);
