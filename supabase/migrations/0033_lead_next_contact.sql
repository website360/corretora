-- 0033_lead_next_contact.sql
-- Campo "próximo contato" dos leads. Alimenta a visualização de calendário
-- de leads (cada lead aparece no dia agendado para o próximo follow-up).
alter table public.customers
  add column if not exists next_contact_at timestamptz;

comment on column public.customers.next_contact_at is
  'Data/hora do próximo contato (follow-up) — usada no calendário de leads.';
