-- 0069_stage_tag_icons.sql
-- Ícone opcional para etiquetas e colunas de kanban (leads e tarefas), que
-- substitui a bolinha colorida. Guardamos o NOME do ícone (ex.: 'star').
-- A cor já é texto (suporta tom predefinido ou hex).

alter table public.tags           add column if not exists icon text;
alter table public.kanban_columns add column if not exists icon text;
alter table public.task_columns   add column if not exists icon text;
