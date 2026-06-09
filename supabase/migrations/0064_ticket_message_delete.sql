-- 0064_ticket_message_delete.sql
-- Permite EXCLUIR mensagens da conversa da tarefa (não há edição). Pode excluir
-- o próprio autor, ou um admin/super_admin da empresa. (Não havia policy de
-- delete, então qualquer exclusão era silenciosamente negada pelo RLS.)

create policy "messages: author or admin delete" on public.ticket_messages for delete
  using (
    author_id = auth.uid()
    or (company_id = app.current_company_id() and app.current_role() in ('admin', 'super_admin'))
  );
