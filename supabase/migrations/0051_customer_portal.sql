-- 0051_customer_portal.sql
-- Portal do Cliente: o cliente (public.customers) ganha acesso logado para ver
-- suas apólices/documentos/dados. Autenticação via Supabase Auth num realm
-- separado (app_metadata.user_type='customer'). O trigger handle_new_user é
-- ajustado para NÃO criar usuário-corretor quando o auth user é um cliente.

alter table public.customers
  add column if not exists portal_enabled boolean not null default false,
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists portal_must_change_password boolean not null default false;

-- Reescreve handle_new_user mantendo TODO o comportamento atual, apenas com um
-- early-return no topo para clientes do portal (não cria empresa nem users).
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
begin
  -- Clientes do portal: não viram usuários-corretores.
  if coalesce(new.raw_app_meta_data ->> 'user_type', new.raw_user_meta_data ->> 'user_type') = 'customer' then
    return new;
  end if;

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
  end if;

  insert into public.users (id, company_id, name, email, role)
  values (
    new.id,
    v_company_id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'admin')
  );

  return new;
end;
$$;
