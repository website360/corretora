-- Tipo do quadro (Kanban): 'tasks' (Tarefas), 'agenda' (eventos) ou 'other'.
-- Separa os quadros por finalidade no dashboard e na navegação. Quadros
-- existentes viram 'tasks' por padrão.

alter table public.task_boards
  add column if not exists kind text not null default 'tasks';

alter table public.task_boards
  drop constraint if exists task_boards_kind_check;
alter table public.task_boards
  add constraint task_boards_kind_check check (kind in ('tasks', 'agenda', 'other'));
