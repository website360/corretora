-- 0058_subject_type_categories.sql
-- As únicas CATEGORIAS de tarefa/evento passam a ser Interna/Cliente/Seguradora.
-- Produto/Contrato/Orçamento deixam de ser categoria (viram apenas Indicadores,
-- derivados dos vínculos product_id/contract_id/quote_id). Migra os registros
-- existentes para uma categoria válida, preservando os vínculos.
--   contract, product  → carrier  (renovações/apólices = seguradora)
--   quote              → customer (atendimento ao cliente)

update public.tickets
   set subject_type = 'carrier'
 where subject_type in ('contract', 'product');

update public.tickets
   set subject_type = 'customer'
 where subject_type = 'quote';

update public.calendar_events
   set subject_type = 'carrier'
 where subject_type in ('contract', 'product');

update public.calendar_events
   set subject_type = 'customer'
 where subject_type = 'quote';
