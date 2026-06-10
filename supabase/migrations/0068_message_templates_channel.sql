-- 0068_message_templates_channel.sql
-- Templates por CANAL: cada evento pode ter um template de e-mail (HTML) e um
-- de WhatsApp (texto), cada um com seus flags (ativo / enviar por padrão).
-- Adiciona a coluna `channel`; as linhas passam a ser por (empresa, evento, canal).

alter table public.email_templates
  add column if not exists channel text not null default 'email';

create index if not exists email_templates_company_event_channel_idx
  on public.email_templates (company_id, event, channel);
