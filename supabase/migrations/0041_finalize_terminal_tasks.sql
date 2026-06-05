-- 0041_finalize_terminal_tasks.sql
-- Migração única de histórico: como a finalização passou a ser por STATUS
-- (não mais pela etapa/coluna), as tarefas que estavam "concluídas" apenas por
-- estarem numa coluna terminal recebem status 'closed' para não voltarem a
-- aparecer como ativas.
update public.tickets t
set status = 'closed', updated_at = now()
from public.task_columns tc
where t.column_id = tc.id
  and tc.is_terminal = true
  and t.status <> 'closed'
  and t.deleted_at is null;
