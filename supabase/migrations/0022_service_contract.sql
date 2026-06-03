-- Vincular atendimento a um contrato/apólice (opcional).
alter table public.service_records
  add column if not exists contract_id uuid references public.contracts (id) on delete set null;
create index if not exists service_contract_idx on public.service_records (contract_id);
