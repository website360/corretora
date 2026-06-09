-- 0060_user_task_filters.sql
-- Filtros da tela "Tarefas & Agenda" passam a ser do USUÁRIO (não da empresa)
-- e a seguir o usuário em qualquer dispositivo: guardados na própria linha de
-- public.users (jsonb). A RLS "users: self update" já permite o usuário gravar
-- na própria linha.
--   task_filter_presets → lista de filtros salvos com nome
--   task_filter_last    → último filtro aplicado (restaurado ao voltar)

alter table public.users
  add column if not exists task_filter_presets jsonb not null default '[]'::jsonb,
  add column if not exists task_filter_last jsonb;
