-- ============================================================================
-- Dono da conta — o usuário que criou a empresa não pode ser excluído.
-- ============================================================================

alter table public.users add column if not exists is_owner boolean not null default false;

-- Backfill: o usuário mais antigo de cada empresa é o dono.
update public.users u
set is_owner = true
from (
  select distinct on (company_id) id
  from public.users
  order by company_id, created_at asc
) first
where u.id = first.id;

-- Novos cadastros: marca como dono quem cria a empresa.
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
  v_is_owner boolean := false;
begin
  v_company_id := nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid;

  if v_company_id is null then
    insert into public.companies (legal_name, trade_name, cnpj, email, phone)
    values (
      coalesce(new.raw_user_meta_data ->> 'company', 'Minha Corretora'),
      coalesce(new.raw_user_meta_data ->> 'company', 'Minha Corretora'),
      'pendente-' || substr(new.id::text, 1, 8),
      new.email, ''
    )
    returning id into v_company_id;
    v_is_owner := true;
  end if;

  insert into public.users (id, company_id, name, email, role, is_owner)
  values (
    new.id,
    v_company_id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'admin'),
    v_is_owner
  );

  return new;
end;
$$;

-- Bloqueia exclusão direta do dono; permite o cascade ao remover a empresa
-- (nesse caso a empresa já não existe mais no momento do delete em cascata).
create or replace function app.protect_owner_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_owner and exists (select 1 from public.companies where id = old.company_id) then
    raise exception 'O dono da conta não pode ser excluído.';
  end if;
  return old;
end;
$$;

drop trigger if exists users_protect_owner on public.users;
create trigger users_protect_owner
  before delete on public.users
  for each row execute function app.protect_owner_delete();
