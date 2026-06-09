-- 0062_filter_presets_generic.sql
-- Generaliza os filtros salvos para qualquer lista do sistema (Tarefas,
-- Contatos, Contratos, Atendimentos…). A tabela vira genérica com uma coluna
-- `scope` que identifica a lista. As policies/índices seguem com o rename.

alter table public.task_filter_presets rename to filter_presets;

alter table public.filter_presets
  add column if not exists scope text not null default 'tasks';

create index if not exists filter_presets_scope_idx
  on public.filter_presets (company_id, scope);
