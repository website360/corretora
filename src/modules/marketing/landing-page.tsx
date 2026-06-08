"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileSignature,
  Headset,
  KanbanSquare,
  LayoutDashboard,
  MessageCircle,
  Play,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserSquare2,
  Users,
} from "lucide-react";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
 * Configuração editável — ajuste contato e planos aqui.
 * ─────────────────────────────────────────────────────────────────────────── */
const WHATSAPP = "5511999999999"; // só dígitos, com DDI+DDD
const WHATSAPP_MSG = encodeURIComponent(
  "Olá! Tenho interesse no sistema para corretoras de seguros e gostaria de saber mais.",
);
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP}?text=${WHATSAPP_MSG}`;
const CONTACT_EMAIL = "contato@agenciamay.com.br";

const PRICING = [
  {
    name: "Starter",
    price: "R$ 99",
    period: "/mês",
    tagline: "Para começar a organizar a corretora.",
    features: ["Até 5 usuários", "500 contatos", "CRM, apólices e agenda", "Atendimento e tarefas"],
    highlight: false,
  },
  {
    name: "Professional",
    price: "R$ 249",
    period: "/mês",
    tagline: "Para equipes em crescimento.",
    features: [
      "Até 15 usuários",
      "2.000 contatos",
      "Tudo do Starter +",
      "WhatsApp e assinatura digital",
      "Relatórios avançados",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    tagline: "Operações grandes, sem limites.",
    features: ["Usuários ilimitados", "Contatos ilimitados", "White-label completo", "Suporte dedicado"],
    highlight: false,
  },
];

const PAINS = [
  {
    title: "Renovações que escapam",
    desc: "Apólices vencendo sem aviso e clientes indo para o concorrente por falta de follow-up.",
  },
  {
    title: "Tudo espalhado em planilhas",
    desc: "Contatos, propostas e comissões em arquivos soltos — ninguém acha nada na hora certa.",
  },
  {
    title: "Atendimento desorganizado",
    desc: "Mensagens no WhatsApp pessoal, sem histórico, sem saber quem falou o quê com cada cliente.",
  },
  {
    title: "Sem visão do funil",
    desc: "Leads sem acompanhamento e nenhum número confiável para decidir onde focar.",
  },
];

const FEATURES = [
  { icon: KanbanSquare, title: "Funil de leads", desc: "Kanban de leads e orçamentos do primeiro contato ao fechamento." },
  { icon: UserSquare2, title: "CRM de clientes", desc: "Cadastro completo, histórico, etiquetas e segmentação." },
  { icon: ShieldCheck, title: "Apólices & renovações", desc: "Gestão de contratos, vigências e alertas de renovação." },
  { icon: Headset, title: "Atendimento", desc: "Central de atendimento com histórico por cliente e canal." },
  { icon: CalendarDays, title: "Tarefas & agenda", desc: "Compromissos, lembretes e agenda integrada da equipe." },
  { icon: BarChart3, title: "Relatórios", desc: "Comissões, produção e desempenho em painéis claros." },
  { icon: FileSignature, title: "Assinatura digital", desc: "Feche contratos com assinatura eletrônica integrada." },
  { icon: LayoutDashboard, title: "Painel do cliente", desc: "Seu cliente acessa apólices e documentos quando quiser." },
];

const STEPS = [
  { n: "01", title: "Crie sua conta", desc: "Comece grátis em minutos, sem cartão de crédito." },
  { n: "02", title: "Importe e organize", desc: "Traga clientes e apólices e configure seu funil." },
  { n: "03", title: "Venda e renove mais", desc: "Acompanhe tudo num só lugar e nunca perca uma renovação." },
];

const STATS = [
  { value: "+30%", label: "em renovações com follow-up no prazo" },
  { value: "1 lugar", label: "para clientes, apólices e atendimento" },
  { value: "100%", label: "na nuvem, acesse de qualquer lugar" },
  { value: "0", label: "planilhas perdidas" },
];

const FAQ = [
  {
    q: "Preciso instalar algo?",
    a: "Não. É 100% na nuvem e funciona no navegador. Também pode ser instalado como app no celular e no computador (PWA).",
  },
  {
    q: "Consigo migrar meus clientes atuais?",
    a: "Sim. Você pode cadastrar e importar seus contatos e apólices, e nossa equipe ajuda no que precisar.",
  },
  {
    q: "Tem fidelidade?",
    a: "Não. Você começa com um teste grátis e assina o plano que fizer sentido, podendo cancelar quando quiser.",
  },
  {
    q: "O sistema tem a minha marca?",
    a: "Sim. Nos planos com white-label você usa seu logo e suas cores, inclusive no painel do cliente.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const brand = env.appName;
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Barra de progresso de rolagem */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-blue-600"
      />

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur supports-[backdrop-filter]:bg-[#0b1220]/70">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="#topo" className="flex items-center gap-2.5 text-white">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-900">
              <Shield className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">{brand}</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <a href="#recursos" className="transition-colors hover:text-white">Recursos</a>
            <a href="#como-funciona" className="transition-colors hover:text-white">Como funciona</a>
            <a href="#planos" className="transition-colors hover:text-white">Planos</a>
            <a href="#faq" className="transition-colors hover:text-white">Dúvidas</a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-blue-600/30"
            >
              Começar grátis
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section id="topo" className="relative overflow-hidden bg-[#0b1220] text-white">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.06]" />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1.2 }}
          className="pointer-events-none absolute -right-40 top-0 size-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)" }}
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ duration: 1.4, delay: 0.2 }}
          className="pointer-events-none absolute -left-32 bottom-0 size-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #1e3a8a, transparent 70%)" }}
        />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-24 pt-16 lg:grid-cols-2 lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"
            >
              <Sparkles className="size-3.5 text-blue-400" /> A plataforma completa para corretoras
              de seguros
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Sua corretora organizada,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                vendendo e renovando mais
              </span>
              .
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 max-w-xl text-lg text-white/70"
            >
              Clientes, apólices, atendimento, agenda e funil de vendas em um só lugar. Pare de
              perder renovações e tempo com planilhas — gerencie tudo com a sofisticação de um
              produto enterprise.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/cadastro"
                className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-600/25 transition-all hover:bg-blue-500"
              >
                Começar grátis
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                <MessageCircle className="size-4 text-emerald-400" /> Falar com vendas
              </a>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-4 flex items-center gap-2 text-sm text-white/50"
            >
              <CheckCircle2 className="size-4 text-emerald-400" /> Teste grátis · sem cartão de crédito
            </motion.p>
          </div>

          {/* Mockup animado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-2 shadow-2xl backdrop-blur">
              <div className="rounded-xl bg-[#0e1626] p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-400/70" />
                  <span className="size-2.5 rounded-full bg-amber-400/70" />
                  <span className="size-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {STATS.slice(0, 3).map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="rounded-lg border border-white/5 bg-white/5 p-3"
                    >
                      <p className="text-lg font-bold text-blue-300">{s.value}</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-white/50">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  {["Apólice renovada — Auto", "Novo lead — Vida", "Tarefa concluída"].map((t, i) => (
                    <motion.div
                      key={t}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.12 }}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      <span className="text-xs text-white/70">{t}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dores */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">O problema</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Gerir uma corretora não precisa ser um caos
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Reconhece alguma dessas situações? Você não está sozinho — e dá para resolver.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PAINS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-shadow hover:shadow-lg">
                <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-500">
                  <span className="text-lg font-bold">!</span>
                </div>
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">A solução</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo o que a sua corretora precisa, num só sistema
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Do primeiro contato à renovação — com a operação inteira conectada.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 0.07}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Simples</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Comece em 3 passos
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="relative rounded-2xl border border-slate-200 bg-white p-7">
                <span className="text-4xl font-bold text-blue-100">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Vídeo demo */}
      <section className="bg-[#0b1220] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Veja em 2 minutos</h2>
            <p className="mt-3 text-lg text-white/60">
              Um tour rápido pelo sistema, do funil de vendas à renovação de apólices.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            {/* Substitua por um embed de YouTube/Loom quando o vídeo estiver pronto. */}
            <div className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-900/40 to-[#0e1626] shadow-2xl">
              <div className="bg-grid absolute inset-0 opacity-[0.05]" />
              <button className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="flex size-20 items-center justify-center rounded-full bg-blue-600 shadow-xl shadow-blue-600/30 transition-transform group-hover:scale-110">
                  <Play className="size-8 translate-x-0.5 fill-white" />
                </span>
                <span className="text-sm font-medium text-white/70">Assistir à demonstração</span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Números */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <div className="grid gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 sm:grid-cols-2 lg:grid-cols-4 lg:p-12">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <p className="text-4xl font-bold text-blue-600">{s.value}</p>
              <p className="mt-1 text-sm text-slate-600">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Planos</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Preços que cabem na sua corretora
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Comece grátis. Faça upgrade quando crescer. Cancele quando quiser.
            </p>
          </Reveal>
          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
            {PRICING.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <div
                  className={cn(
                    "flex h-full flex-col rounded-3xl border bg-white p-7 transition-shadow",
                    plan.highlight
                      ? "border-blue-600 shadow-2xl shadow-blue-600/10 ring-1 ring-blue-600"
                      : "border-slate-200 hover:shadow-lg",
                  )}
                >
                  {plan.highlight && (
                    <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      <Sparkles className="size-3" /> Mais popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    <span className="mb-1 text-sm text-slate-500">{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        <span className="text-slate-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/cadastro"
                    className={cn(
                      "mt-7 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors",
                      plan.highlight
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "border border-slate-300 text-slate-900 hover:bg-slate-50",
                    )}
                  >
                    Começar grátis
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Precisa de algo sob medida?{" "}
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
              Fale com nosso time
            </a>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown
                    className={cn("size-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-slate-600">{item.a}</p>
                </motion.div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-900 px-8 py-14 text-center text-white shadow-2xl lg:px-16 lg:py-20">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Pronto para profissionalizar a sua corretora?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-white/80">
                Comece o teste grátis agora ou fale com nosso time. Leva poucos minutos.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/cadastro"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-blue-700 shadow-lg transition-transform hover:scale-[1.02]"
                >
                  Começar grátis <ArrowRight className="size-4" />
                </Link>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <MessageCircle className="size-4" /> Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-900 text-white">
              <Shield className="size-4" />
            </span>
            <span className="font-semibold">{brand}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-slate-900">
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-slate-900">{CONTACT_EMAIL}</a>
            <Link href="/login" className="inline-flex items-center gap-1.5 hover:text-slate-900">
              <Users className="size-4" /> Entrar
            </Link>
            <Link href="/cadastro" className="inline-flex items-center gap-1.5 hover:text-slate-900">
              <Smartphone className="size-4" /> Criar conta
            </Link>
          </div>
        </div>
        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {brand}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
