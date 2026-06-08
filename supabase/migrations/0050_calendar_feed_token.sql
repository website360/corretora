-- 0050_calendar_feed_token.sql
-- Token secreto por usuário para o feed iCalendar (.ics) assinável no
-- Outlook/Google/Apple. O endpoint público lê os eventos do usuário por este
-- token (sem sessão). Rotacionável para revogar o link.

alter table public.users
  add column if not exists calendar_token uuid not null default gen_random_uuid();

create unique index if not exists users_calendar_token_idx
  on public.users (calendar_token);
