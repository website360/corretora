-- ============================================================================
-- Row Level Security — full multi-tenant isolation.
--
-- Strategy:
--   * Enable RLS on every table.
--   * Tenant rows are visible only when `company_id = app.current_company_id()`.
--   * Super admins bypass tenant scoping (platform operators).
--   * Writes additionally check role where it matters (e.g. user management).
-- ============================================================================

alter table public.companies            enable row level security;
alter table public.users                 enable row level security;
alter table public.customers             enable row level security;
alter table public.customer_interactions enable row level security;
alter table public.tickets               enable row level security;
alter table public.ticket_messages       enable row level security;
alter table public.ticket_participants   enable row level security;
alter table public.ticket_logs           enable row level security;
alter table public.ticket_tags           enable row level security;
alter table public.calendar_events       enable row level security;
alter table public.company_modules       enable row level security;
alter table public.notifications         enable row level security;
alter table public.modules               enable row level security;

-- ───────────────────────────── companies ──────────────────────────────────
create policy "companies: members read own tenant"
  on public.companies for select
  using (id = app.current_company_id() or app.is_super_admin());

create policy "companies: admins update own tenant"
  on public.companies for update
  using ((id = app.current_company_id() and app.current_role() in ('admin','super_admin')) or app.is_super_admin());

create policy "companies: super admin manages all"
  on public.companies for all
  using (app.is_super_admin())
  with check (app.is_super_admin());

-- ─────────────────────────────── users ────────────────────────────────────
create policy "users: read same tenant"
  on public.users for select
  using (company_id = app.current_company_id() or app.is_super_admin());

create policy "users: self update"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users: admins manage tenant members"
  on public.users for all
  using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
  with check (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- ─── Generic tenant policies (select/insert/update/delete) for tenant tables ─
-- customers
create policy "customers: tenant read"   on public.customers for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "customers: tenant write"  on public.customers for insert with check (company_id = app.current_company_id());
create policy "customers: tenant update" on public.customers for update using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
create policy "customers: tenant delete" on public.customers for delete using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- customer_interactions
create policy "interactions: tenant read"  on public.customer_interactions for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "interactions: tenant write" on public.customer_interactions for insert with check (company_id = app.current_company_id());

-- tickets
create policy "tickets: tenant read"   on public.tickets for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "tickets: tenant write"  on public.tickets for insert with check (company_id = app.current_company_id());
create policy "tickets: tenant update" on public.tickets for update using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
create policy "tickets: tenant delete" on public.tickets for delete using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- ticket_messages
create policy "messages: tenant read"  on public.ticket_messages for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "messages: tenant write" on public.ticket_messages for insert with check (company_id = app.current_company_id() and author_id = auth.uid());
create policy "messages: author update" on public.ticket_messages for update using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ticket_logs
create policy "logs: tenant read"  on public.ticket_logs for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "logs: tenant write" on public.ticket_logs for insert with check (company_id = app.current_company_id());

-- ticket_participants (scoped via the parent ticket)
create policy "participants: tenant read" on public.ticket_participants for select
  using (exists (select 1 from public.tickets t where t.id = ticket_id and t.company_id = app.current_company_id()));
create policy "participants: tenant write" on public.ticket_participants for all
  using (exists (select 1 from public.tickets t where t.id = ticket_id and t.company_id = app.current_company_id()))
  with check (exists (select 1 from public.tickets t where t.id = ticket_id and t.company_id = app.current_company_id()));

-- ticket_tags
create policy "tags: tenant all" on public.ticket_tags for all
  using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());

-- calendar_events
create policy "events: tenant read"  on public.calendar_events for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "events: tenant write" on public.calendar_events for insert with check (company_id = app.current_company_id());
create policy "events: tenant update" on public.calendar_events for update using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
create policy "events: tenant delete" on public.calendar_events for delete using (company_id = app.current_company_id());

-- company_modules
create policy "company_modules: tenant read"  on public.company_modules for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "company_modules: admin write"  on public.company_modules for all
  using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
  with check (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- notifications (scoped to the recipient)
create policy "notifications: own read"   on public.notifications for select using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: tenant insert" on public.notifications for insert with check (company_id = app.current_company_id());

-- modules catalogue is public read-only
create policy "modules: read all" on public.modules for select using (true);
