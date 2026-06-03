-- Per-plan available modules (which feature areas the plan unlocks).
alter table public.plans
  add column if not exists modules text[] not null default '{}';

-- Seed existing plans with the full set (current behavior: everything available).
update public.plans
set modules = array[
  'leads','contatos','orcamentos','contratos','tarefas',
  'atendimento','catalogo','relatorios','assinatura','whatsapp'
]
where cardinality(modules) = 0;
