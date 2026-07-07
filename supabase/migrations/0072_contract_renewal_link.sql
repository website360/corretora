-- Optional link from a contract (status = 'renewal') to the new contract that
-- renews/replaces it. Self-reference on public.contracts; nullable and set null
-- if the linked contract is removed.

alter table public.contracts
  add column if not exists renewal_contract_id uuid
    references public.contracts (id) on delete set null;

create index if not exists contracts_renewal_contract_idx
  on public.contracts (renewal_contract_id);
