-- 0054_cleanup_orphan_tags.sql
-- Remove tags "soltas" que eram defaults antigas (renomeadas/excluídas do
-- catálogo antes do vínculo por ID): não vinculadas, fora do catálogo atual e
-- presentes em 2+ corretoras (assinatura de seed). Confirmado com o usuário.
-- (Registros que já usam esses textos mantêm o rótulo; só some do gerenciador.)

delete from public.tags as t
where t.default_tag_id is null
  and not exists (select 1 from public.default_tags dt where dt.name = t.name)
  and t.name in (
    select name
    from public.tags
    where default_tag_id is null
    group by name
    having count(distinct company_id) >= 2
  );
