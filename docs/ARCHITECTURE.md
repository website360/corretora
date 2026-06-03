# Arquitetura

Documento de referência da arquitetura da plataforma.

## Princípios

1. **Modularidade** — cada funcionalidade vive em `src/modules/<dominio>` e pode ser
   ligada/desligada por plano (ver `src/config/modules.ts` e a tabela `company_modules`).
2. **Camadas claras** — UI (`components`, `modules`, `layouts`) → dados (`services`) →
   infraestrutura (`lib/supabase`). A UI nunca fala direto com o banco.
3. **Tipagem forte** — o domínio é descrito uma vez em `src/types/domain.ts` e reutilizado
   em toda parte (UI, services, validações Zod, tipos do Supabase).
4. **Tenant-first** — todo dado é escopado por `company_id`, validado no banco via RLS.

## Camada de dados (services)

Os _services_ (`src/services/*.service.ts`) expõem uma API assíncrona por domínio
(`list`, `get`, `create`, `update`...). Hoje eles operam sobre o dataset mockado
(`src/services/mock/data.ts`) com latência simulada, mantendo o app navegável sem
backend. Para produção, troque o corpo de cada método por chamadas ao cliente
Supabase — a **assinatura pública não muda**, então a UI permanece intacta.

```
Componente (modules/*)  ──►  hook use-async-data  ──►  service  ──►  mock | Supabase
```

### Por que essa abstração?

- Permite desenvolver/demonstrar a UI sem provisionar infra.
- Centraliza o ponto de migração para o Supabase.
- Facilita testes (mockar um service é trivial).

## Sessão e RBAC

- `getSessionUser()` resolve o usuário logado + empresa (no mock, um usuário fixo;
  em produção, a partir do `auth.uid()`).
- `SessionProvider` injeta `user` e `can(roles)` na árvore do grupo `(app)`.
- A navegação (`config/navigation.ts`) e telas usam `can()` para esconder o que o
  papel não acessa; o **backend** reforça via RLS.

## Multi-tenant (RLS)

Funções `SECURITY DEFINER` no schema `app` resolvem o tenant e o papel do chamador
sem disparar recursão de RLS:

- `app.current_company_id()` — empresa do usuário autenticado.
- `app.current_role()` — papel do usuário.
- `app.is_super_admin()` — bypass para operadores da plataforma.

Cada tabela tenant-scoped tem políticas `select/insert/update/delete` que comparam
`company_id = app.current_company_id()`. Ver `supabase/migrations/0002_rls.sql`.

## Tickets / Helpdesk

- **Inbox** (`modules/tickets/tickets-inbox.tsx`): lista filtrável à esquerda e
  conversa à direita; responsivo (uma coluna por vez no mobile).
- **Conversa** (`ticket-conversation.tsx`): mensagens em bolhas, notas internas,
  anexos, troca de status/prioridade/responsável e painel de detalhes.
- **Realtime** (`hooks/use-realtime.ts`): assina `postgres_changes` do Supabase
  para `ticket_messages`. No modo mock é no-op; em produção, basta habilitar a
  replicação da tabela.
- **Logs** (`ticket_logs`): trilha de auditoria de eventos (criação, atribuição,
  mudança de status…).

## Tema e design system

- Tokens em `src/app/globals.css` (HSL) com dark mode via `next-themes`.
- Primitivos em `components/ui` seguem o padrão REUI/Radix + `class-variance-authority`.
- Paleta: azul premium `#2563eb`, azul escuro `#1e3a8a`, neutros sofisticados,
  sombras suaves e gradientes sutis.

## Decisões e trade-offs

- **`use-async-data`** é um hook minimalista; em produção recomenda-se **TanStack Query**
  (cache, revalidação, paginação infinita) — a troca é localizada.
- **Tipos do Supabase** estão escritos à mão (`types/database.ts`) para o demo;
  regenere-os com a CLI ao conectar o projeto real.
