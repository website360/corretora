-- Responsável (owner) for a contract — the broker/teammate accountable for it.

alter table public.contracts
  add column if not exists owner_id uuid references public.users (id) on delete set null;

create index if not exists contracts_owner_idx on public.contracts (owner_id);
