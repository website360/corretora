-- Backfill: tarefas/eventos sem quadro (board_id nulo) vão para o quadro padrão
-- da empresa, na 1ª coluna. Antes eles só apareciam "dobrados" na 1ª coluna do
-- Quadro, mas não podiam ser filtrados por etapa (o filtro usa column_id), o que
-- fazia o deep-link dos indicadores do dashboard não mostrar esses itens.

with default_board as (
  select distinct on (b.company_id)
    b.company_id,
    b.id as board_id,
    (
      select c.id from public.task_columns c
      where c.board_id = b.id
      order by c.position asc
      limit 1
    ) as column_id
  from public.task_boards b
  order by b.company_id, b.is_default desc, b.position asc
)
update public.tickets t
set board_id = d.board_id, column_id = d.column_id
from default_board d
where t.board_id is null
  and d.company_id = t.company_id
  and d.column_id is not null;

with default_board as (
  select distinct on (b.company_id)
    b.company_id,
    b.id as board_id,
    (
      select c.id from public.task_columns c
      where c.board_id = b.id
      order by c.position asc
      limit 1
    ) as column_id
  from public.task_boards b
  order by b.company_id, b.is_default desc, b.position asc
)
update public.calendar_events e
set board_id = d.board_id, column_id = d.column_id
from default_board d
where e.board_id is null
  and d.company_id = e.company_id
  and d.column_id is not null;
