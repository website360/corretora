# Corretora SaaS

Plataforma **SaaS multi-tenant** para corretoras de seguros — atendimento (helpdesk),
gestão de clientes, agenda e operação, com visual _enterprise_ inspirado em Linear,
Stripe, HubSpot e Zendesk.

> Construído como uma base **real, escalável e pronta para evoluir**: arquitetura
> modular, multiempresa com isolamento de dados (RLS), RBAC e dark mode nativo.

---

## ✨ Destaques

- **Multi-tenant** com isolamento completo por empresa (Row Level Security no Postgres).
- **RBAC**: Super Admin, Admin da Empresa, Corretor e Assistente.
- **Helpdesk estilo inbox** (lista + conversa), notas internas, menções, anexos,
  timeline de eventos e estrutura de **realtime** (Supabase Postgres Changes).
- **Dashboard** com KPIs, gráficos (Recharts), tickets recentes e agenda do dia.
- **CRUD completo**: Empresas, Usuários, Clientes (+ perfil e timeline).
- **Agenda** com calendário mensal e criação de eventos.
- **Command palette** (⌘K), notificações, busca global e tema claro/escuro.
- **Arquitetura modular** preparada para billing, automações, IA e white-label.
- **Roda sem backend**: camada de dados mockados profissional habilitada por padrão.

---

## 🧱 Stack

| Camada        | Tecnologia                                            |
| ------------- | ----------------------------------------------------- |
| Framework     | **Next.js 15** (App Router) + **React 19**            |
| Linguagem     | **TypeScript** (strict)                               |
| UI            | **TailwindCSS** + componentes estilo **REUI/Radix**   |
| Tabelas       | **TanStack Table**                                    |
| Formulários   | **React Hook Form** + **Zod**                         |
| Estado        | **Zustand** + React Context                           |
| Gráficos      | **Recharts**                                          |
| Animação      | **Framer Motion**                                     |
| Ícones        | **lucide-react**                                      |
| Datas         | **date-fns** (pt-BR)                                   |
| Toasts        | **sonner**                                            |
| Backend       | **Supabase** (Postgres, Auth, Realtime, Storage)      |

---

## 🚀 Começando

```bash
# 1. Instalar dependências
npm install

# 2. Variáveis de ambiente (já incluso um .env.local com mocks ligados)
cp .env.example .env.local   # opcional — ajuste conforme necessário

# 3. Rodar em desenvolvimento
npm run dev
```

Abra **http://localhost:3000** → você é redirecionado para o **/dashboard**.

> Por padrão `NEXT_PUBLIC_USE_MOCKS=true`: a aplicação roda 100% com dados
> mockados realistas, **sem precisar de Supabase**. Para conectar o backend real,
> veja [Conectando o Supabase](#-conectando-o-supabase).

### Scripts

| Comando             | Descrição                            |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento          |
| `npm run build`     | Build de produção                    |
| `npm run start`     | Servir o build                       |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`)   |
| `npm run lint`      | Lint                                 |
| `npm run format`    | Prettier                             |

---

## 📁 Arquitetura de pastas

```
src/
├── app/                      # Rotas (App Router)
│   ├── (auth)/               #   grupo público: login, cadastro, recuperar-senha
│   └── (app)/                #   grupo autenticado: dashboard, tickets, clientes...
├── modules/                  # Funcionalidades isoladas por domínio (vendáveis)
│   ├── dashboard/  customers/  users/  companies/  tickets/  calendar/  settings/
├── components/
│   ├── ui/                   # Primitivos estilo REUI (button, card, dialog, table...)
│   └── common/               # Compostos reutilizáveis (data-table, page-header...)
├── layouts/                  # Shell: sidebar, topbar, command palette, menus
├── services/                 # Camada de dados (abstrai Supabase vs. mocks)
│   └── mock/                 #   dataset profissional de demonstração
├── hooks/                    # Hooks reutilizáveis (use-async-data, use-realtime)
├── providers/                # Theme, tooltips, toaster
├── contexts/                 # SessionProvider (usuário + empresa + RBAC)
├── stores/                   # Zustand (UI state)
├── lib/                      # utils, validations (Zod), clients Supabase
├── config/                   # navegação, domínio (status/prioridades), módulos, env
├── types/                    # tipos de domínio + Database (Supabase)
├── utils/                    # formatação (moeda, datas, CPF/CNPJ, telefone)
└── middleware.ts             # proteção de rotas + refresh de sessão
supabase/
├── migrations/0001_init.sql  # schema, enums, triggers, funções
├── migrations/0002_rls.sql   # políticas RLS multi-tenant
└── seed.sql                  # catálogo de módulos + tenant demo
```

Veja **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** para o detalhamento dos fluxos.

---

## 🏢 Fluxo multiempresa (multi-tenant)

1. Cada registro pertence a uma **empresa** (`company_id`).
2. O usuário logado resolve sua empresa via `app.current_company_id()` (SQL) /
   `SessionProvider` (UI).
3. **RLS** garante que cada consulta só enxergue dados do próprio tenant.
4. **Super Admin** transita entre empresas (operador da plataforma).

## 🔐 Fluxo de autenticação

`Cadastro/Login` → **Supabase Auth** → cookie de sessão → `middleware.ts`
refaz a sessão e protege as rotas → trigger `handle_new_user` cria o perfil em
`public.users` e a empresa (no primeiro cadastro).

## 👥 Permissões (RBAC)

| Função        | Acesso                                                        |
| ------------- | ------------------------------------------------------------- |
| `super_admin` | Tudo, em todas as empresas (módulo Empresas).                 |
| `admin`       | Toda a empresa + gestão de usuários.                          |
| `broker`      | Clientes, tickets, agenda.                                    |
| `assistant`   | Operação de atendimento (tickets) e suporte.                  |

A navegação é filtrada por função em [`src/config/navigation.ts`](src/config/navigation.ts);
no backend, as políticas em [`0002_rls.sql`](supabase/migrations/0002_rls.sql) impõem as regras.

---

## 🔌 Conectando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrations e o seed:
   ```bash
   # via Supabase CLI
   supabase db push          # aplica supabase/migrations/*
   supabase db execute -f supabase/seed.sql
   # ou cole o conteúdo dos arquivos no SQL Editor do painel
   ```
3. **Realtime**: em _Database → Replication_, habilite a publicação para
   `ticket_messages`, `tickets` e `notifications`.
4. **Storage**: crie um bucket `attachments` para anexos de tickets.
5. Preencha `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_USE_MOCKS=false
   ```
6. (Opcional) Regere os tipos: `supabase gen types typescript --project-id <ref> > src/types/database.ts`.

Com `NEXT_PUBLIC_USE_MOCKS=false`, os _services_ passam a falar com o Supabase
e o `middleware` volta a proteger as rotas.

---

## ☁️ Deploy (Vercel + Supabase)

Veja **[docs/DEPLOY.md](docs/DEPLOY.md)**. Resumo:

1. Suba o repositório no GitHub.
2. Importe no **Vercel** → framework detectado (Next.js).
3. Configure as variáveis de ambiente (as mesmas do `.env.example`).
4. Deploy. O `middleware` e o App Router funcionam nativamente na Vercel.

---

## 🗺️ Roadmap (estrutura já preparada)

- [ ] Billing & assinaturas (planos por módulo) — `modules` / `company_modules`.
- [ ] Portal do cliente e white-label.
- [ ] API pública e webhooks.
- [ ] Inbox de e-mail e WhatsApp.
- [ ] Automações e IA/chatbot.
- [ ] SLA por prioridade (campos já modelados nos tickets).

---

## 📄 Licença

Projeto base proprietário — adapte conforme a necessidade do seu produto.
