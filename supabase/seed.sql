-- ============================================================================
-- Seed data
--
-- The modules catalogue is always safe to seed. Demo tenant data (company,
-- customers, tickets) is inserted with a fixed company id so you can explore
-- the schema immediately. Users are created through Supabase Auth sign-up
-- (the on_auth_user_created trigger provisions public.users), so assignees
-- start NULL here — assign them once real users exist.
-- ============================================================================

-- ─────────────────────────── modules catalogue ────────────────────────────
insert into public.modules (key, name, description, min_plan) values
  ('dashboard',   'Dashboard',            'Visão geral, KPIs e métricas.',                 'starter'),
  ('customers',   'Clientes',             'Gestão da carteira de clientes.',               'starter'),
  ('tickets',     'Tickets & Atendimento','Helpdesk, tarefas e colaboração.',              'starter'),
  ('calendar',    'Agenda',               'Calendário, reuniões e lembretes.',             'professional'),
  ('users',       'Equipe & Permissões',  'Usuários, RBAC e convites.',                    'professional'),
  ('billing',     'Billing & Assinaturas','Planos e cobrança recorrente.',                 'enterprise'),
  ('automations', 'Automações & IA',      'Fluxos automáticos, chatbot e integrações.',    'enterprise')
on conflict (key) do nothing;

-- ─────────────────────────────── demo tenant ──────────────────────────────
insert into public.companies (id, legal_name, trade_name, cnpj, email, phone, status, plan)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Apex Corretora de Seguros LTDA', 'Apex Seguros',
  '12.345.678/0001-90', 'contato@apexseguros.com.br', '(11) 4002-8922',
  'active', 'enterprise'
)
on conflict (id) do nothing;

-- Enable all modules for the demo tenant.
insert into public.company_modules (company_id, module_key, enabled)
select '00000000-0000-0000-0000-0000000000a1', key, true from public.modules
on conflict do nothing;

-- ───────────────────────────── demo customers ─────────────────────────────
insert into public.customers (company_id, person_type, name, document, email, phone, tags, status)
values
  ('00000000-0000-0000-0000-0000000000a1', 'company',    'Construtora Horizonte LTDA', '21.345.678/0001-22', 'financeiro@horizonteconstrutora.com.br', '(11) 3344-5566', '{frota,empresarial,premium}', 'active'),
  ('00000000-0000-0000-0000-0000000000a1', 'individual', 'Carlos Eduardo Tavares',     '123.456.789-09',     'carlos.tavares@gmail.com',               '(11) 99876-5544', '{auto,residencial}',         'active'),
  ('00000000-0000-0000-0000-0000000000a1', 'individual', 'Patrícia Nogueira',          '987.654.321-00',     'patricia.nogueira@outlook.com',          '(11) 98123-9090', '{vida}',                     'active')
on conflict do nothing;

-- ─────────────────────────────── demo tickets ─────────────────────────────
insert into public.tickets (company_id, title, description, status, priority, category, tags)
values
  ('00000000-0000-0000-0000-0000000000a1', 'Sinistro veículo frota', 'Colisão traseira reportada pelo cliente.', 'in_progress', 'high',   'claim',      '{frota,urgente}'),
  ('00000000-0000-0000-0000-0000000000a1', 'Renovação seguro auto',  'Apólice vence em 15 dias.',                'open',        'medium', 'renewal',    '{renovação}'),
  ('00000000-0000-0000-0000-0000000000a1', 'Emissão nova apólice',   'Cliente aprovou a proposta empresarial.',  'open',        'high',   'new_policy', '{empresarial}')
on conflict do nothing;
