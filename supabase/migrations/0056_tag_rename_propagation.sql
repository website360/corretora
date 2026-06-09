-- 0056_tag_rename_propagation.sql
-- As tags são referenciadas pelo NOME (text[]) em tarefas, eventos e clientes.
-- Ao renomear uma tag, propaga o novo nome para todos os registros da empresa
-- que a utilizam. Como o trigger é em public.tags, cobre tanto a renomeação
-- pela corretora quanto a propagação automática de tag padrão (0053).

create or replace function app.rename_tag_on_records()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name then
    update public.tickets
      set tags = array_replace(tags, old.name, new.name)
      where company_id = new.company_id and old.name = any (tags);
    update public.calendar_events
      set tags = array_replace(tags, old.name, new.name)
      where company_id = new.company_id and old.name = any (tags);
    update public.customers
      set tags = array_replace(tags, old.name, new.name)
      where company_id = new.company_id and old.name = any (tags);
  end if;
  return new;
end; $$;

drop trigger if exists trg_rename_tag_on_records on public.tags;
create trigger trg_rename_tag_on_records
  after update on public.tags
  for each row execute function app.rename_tag_on_records();
