-- 0080_super_admin_write_access.sql
-- Super admin: escrita nas empresas que ele já enxerga.
--
-- As políticas de leitura sempre tiveram o escape "or app.is_super_admin()",
-- mas as de escrita não — o super admin lia os dados de qualquer corretora e
-- não conseguia gravar nenhum. Na prática o sistema inteiro ficava em modo
-- somente-leitura para ele fora da própria empresa: salvar um contrato ou
-- editar um usuário de outra corretora batia em zero linhas e o PostgREST
-- devolvia erro.
--
-- Aqui o mesmo escape passa para as políticas de escrita multi-tenant.
--
-- Continuam SEM o escape, de propósito, as políticas de escopo pessoal — nelas
-- "dono" é o usuário, não a empresa, e um super admin não deve assumir o lugar
-- de outra pessoa:
--   • filter_presets (insert/update/delete own) — filtros salvos de cada um
--   • notifications: own update                 — estado de leitura próprio
--   • ticket_messages: author update            — só o autor edita a mensagem
--   • users: self update                        — perfil próprio
-- Políticas permissivas se somam (OR), então manter essas intactas não bloqueia
-- nada: o super admin passa pela política de tenant correspondente.

-- ── Clientes e interações ────────────────────────────────────────────────
alter policy "customers: tenant write" on public.customers
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "customers: tenant update" on public.customers
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "customers: tenant delete" on public.customers
  using (
    (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
    or app.is_super_admin()
  );

alter policy "interactions: tenant write" on public.customer_interactions
  with check (company_id = app.current_company_id() or app.is_super_admin());

-- ── Contratos e anexos ───────────────────────────────────────────────────
alter policy "contracts: tenant manage" on public.contracts
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "contract_attachments: tenant manage" on public.contract_attachments
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

-- ── Orçamentos ───────────────────────────────────────────────────────────
alter policy "quotes: tenant manage" on public.quotes
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "quote_options: tenant manage" on public.quote_options
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

-- ── Sinistros ────────────────────────────────────────────────────────────
alter policy "claims: tenant manage" on public.claims
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "claim_updates: tenant manage" on public.claim_updates
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

-- ── Atendimentos ─────────────────────────────────────────────────────────
alter policy "service: tenant manage" on public.service_records
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

-- ── Catálogo (seguradoras e produtos) ────────────────────────────────────
alter policy "carriers: tenant insert" on public.insurance_carriers
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "carriers: tenant update" on public.insurance_carriers
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "carriers: tenant delete" on public.insurance_carriers
  using (company_id = app.current_company_id() or app.is_super_admin());

alter policy "products: tenant insert" on public.insurance_products
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "products: tenant update" on public.insurance_products
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "products: tenant delete" on public.insurance_products
  using (company_id = app.current_company_id() or app.is_super_admin());

-- ── Tickets ──────────────────────────────────────────────────────────────
alter policy "tickets: tenant write" on public.tickets
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "tickets: tenant update" on public.tickets
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "tickets: tenant delete" on public.tickets
  using (
    (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
    or app.is_super_admin()
  );

-- Mensagem continua sendo escrita em nome de quem está logado (author_id).
alter policy "messages: tenant write" on public.ticket_messages
  with check (
    (company_id = app.current_company_id() or app.is_super_admin())
    and author_id = auth.uid()
  );

alter policy "logs: tenant write" on public.ticket_logs
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "participants: tenant write" on public.ticket_participants
  using (
    exists (select 1 from public.tickets t
             where t.id = ticket_id and t.company_id = app.current_company_id())
    or app.is_super_admin()
  )
  with check (
    exists (select 1 from public.tickets t
             where t.id = ticket_id and t.company_id = app.current_company_id())
    or app.is_super_admin()
  );

alter policy "tags: tenant all" on public.ticket_tags
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

-- ── Tarefas e agenda ─────────────────────────────────────────────────────
alter policy "stages: tenant manage" on public.task_stages
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "task_checklists: tenant manage" on public.task_checklists
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "task_checklist_items: tenant manage" on public.task_checklist_items
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "events: tenant write" on public.calendar_events
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "events: tenant update" on public.calendar_events
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "events: tenant delete" on public.calendar_events
  using (company_id = app.current_company_id() or app.is_super_admin());

-- ── Etiquetas ────────────────────────────────────────────────────────────
alter policy "tags: tenant insert" on public.tags
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "tags: tenant update" on public.tags
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
alter policy "tags: tenant delete" on public.tags
  using (company_id = app.current_company_id() or app.is_super_admin());

-- ── Notificações (criação; o "lida/não lida" continua pessoal) ───────────
alter policy "notifications: tenant insert" on public.notifications
  with check (company_id = app.current_company_id() or app.is_super_admin());

-- ── Equipe, grupos e módulos ─────────────────────────────────────────────
alter policy "users: admins manage tenant members" on public.users
  using (
    (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
    or app.is_super_admin()
  )
  with check (
    (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
    or app.is_super_admin()
  );

alter policy "groups: tenant manage" on public.user_groups
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());

alter policy "company_modules: admin write" on public.company_modules
  using (
    (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
    or app.is_super_admin()
  )
  with check (
    (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
    or app.is_super_admin()
  );

-- ── Meios de pagamento ───────────────────────────────────────────────────
alter policy "cards: tenant manage" on public.payment_methods
  using (company_id = app.current_company_id() or app.is_super_admin())
  with check (company_id = app.current_company_id() or app.is_super_admin());
