-- ============================================================================
-- Novo tipo de tarefa: "Lead". Usado, entre outros, pela tarefa automática de
-- recuperação criada quando um lead é arrastado para a coluna "Perdido".
--
-- ALTER TYPE ... ADD VALUE precisa ficar sozinho no arquivo: o runner executa
-- o arquivo inteiro como uma query só (transação implícita) e adicionar valor
-- de enum não pode compartilhar transação com uso do próprio valor.
-- ============================================================================

alter type public.ticket_subject_type add value if not exists 'lead';
