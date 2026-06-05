-- 0037_ticket_contract_quote.sql
-- Permite vincular tarefas (tickets) a Contrato e Orçamento, além de
-- cliente/seguradora/produto.

-- Novos tipos de vínculo no enum compartilhado (idempotente).
alter type ticket_subject_type add value if not exists 'contract';
alter type ticket_subject_type add value if not exists 'quote';

-- Colunas de vínculo nas tarefas.
alter table public.tickets
  add column if not exists contract_id uuid references public.contracts (id) on delete set null,
  add column if not exists quote_id    uuid references public.quotes (id)    on delete set null;

create index if not exists tickets_contract_idx on public.tickets (contract_id);
create index if not exists tickets_quote_idx    on public.tickets (quote_id);
