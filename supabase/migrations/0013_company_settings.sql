-- ============================================================================
-- Company-wide system preferences (admin-managed, apply to all members).
-- Stored as JSON: { taskTimeEnabled: bool, sortRules: [{key, dir}, ...] }
-- Writes are already restricted to admins by the companies UPDATE policy.
-- ============================================================================

alter table public.companies
  add column if not exists settings jsonb not null default '{}'::jsonb;
