-- 0066_board_manage_super_admin.sql
-- Super admin via filtro global de empresa SÓ conseguia LER boards de outras
-- empresas (read tem `or is_super_admin()`), mas as policies de "manage" eram
-- escopadas só à própria empresa. Resultado: excluir/editar um kanban de outra
-- empresa era negado pelo RLS sem erro (0 linhas) — "excluí mas continua lá".
-- Alinha o manage de boards/colunas (leads e tarefas) com o read.

drop policy if exists "boards: tenant manage" on public.kanban_boards;
create policy "boards: tenant manage" on public.kanban_boards for all
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

drop policy if exists "columns: tenant manage" on public.kanban_columns;
create policy "columns: tenant manage" on public.kanban_columns for all
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

drop policy if exists "task_boards: tenant manage" on public.task_boards;
create policy "task_boards: tenant manage" on public.task_boards for all
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

drop policy if exists "task_columns: tenant manage" on public.task_columns;
create policy "task_columns: tenant manage" on public.task_columns for all
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
