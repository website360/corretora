-- 0059_renewal_category_customer.sql
-- As tarefas de RENOVAÇÃO passam a ter categoria Cliente (antes Seguradora).
-- Alvo preciso pelo campo `category='renewal'` para não tocar em tarefas que o
-- usuário marcou manualmente como Seguradora no 0058.

update public.tickets
   set subject_type = 'customer'
 where category = 'renewal'
   and subject_type <> 'customer';
