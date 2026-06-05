-- 0034_onboarding.sql
-- Onboarding obrigatório: após escolher o plano, a empresa precisa finalizar
-- o cadastro (perfil + dados da empresa) antes de navegar no sistema.
alter table public.companies
  add column if not exists onboarding_completed boolean not null default false;

-- Empresas que já possuem plano são consideradas já integradas, para não
-- forçar o onboarding em clientes existentes.
update public.companies set onboarding_completed = true where plan_id is not null;

comment on column public.companies.onboarding_completed is
  'Indica se a empresa concluiu o cadastro inicial (perfil + dados) após escolher o plano.';
