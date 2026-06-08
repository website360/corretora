"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  AlertTriangle,
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
  Star,
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
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Barra de progresso de rolagem */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-blue-600"
      />

      {/* Navbar flutuante */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-x-0 top-0 z-40 px-4 pt-3 sm:pt-4"
      >
        <nav
          className={cn(
            "mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-4 transition-all duration-300 sm:px-5",
            scrolled
              ? "border border-slate-200 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur-xl"
              : "border border-white/10 bg-white/[0.06] backdrop-blur-md",
          )}
        >
          <Link
            href="#topo"
            className={cn(
              "flex items-center gap-2.5 transition-colors",
              scrolled ? "text-slate-900" : "text-white",
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-900 text-white">
              <Shield className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">{brand}</span>
          </Link>
          <div
            className={cn(
              "hidden items-center gap-7 text-sm transition-colors md:flex",
              scrolled ? "text-slate-600" : "text-white/70",
            )}
          >
            <a href="#recursos" className={cn("transition-colors", scrolled ? "hover:text-slate-900" : "hover:text-white")}>Recursos</a>
            <a href="#como-funciona" className={cn("transition-colors", scrolled ? "hover:text-slate-900" : "hover:text-white")}>Como funciona</a>
            <a href="#planos" className={cn("transition-colors", scrolled ? "hover:text-slate-900" : "hover:text-white")}>Planos</a>
            <a href="#faq" className={cn("transition-colors", scrolled ? "hover:text-slate-900" : "hover:text-white")}>Dúvidas</a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(
                "hidden rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:block",
                scrolled ? "text-slate-700 hover:text-slate-900" : "text-white/80 hover:text-white",
              )}
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500"
            >
              Começar grátis
            </Link>
          </div>
        </nav>
      </motion.header>

      {/* Hero */}
      <section id="topo" className="relative flex min-h-screen flex-col overflow-hidden bg-[#070b15] text-white">
        {/* Fundo: aurora animada + grid + vinheta */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="bg-grid absolute inset-0 opacity-[0.05]" />
          <motion.div
            className="absolute -top-40 left-1/4 size-[640px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(37,99,235,0.55), transparent 70%)" }}
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-24 top-1/4 size-[520px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)" }}
            animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-10 left-1/3 size-[460px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(14,165,233,0.4), transparent 70%)" }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#070b15_85%)]" />
        </div>

        {/* Conteúdo */}
        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pt-32 text-center">
          <motion.a
            href="#recursos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur transition-colors hover:bg-white/10"
          >
            <Sparkles className="size-3.5 text-blue-400" /> A plataforma completa para corretoras de
            seguros
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
          >
            A plataforma que faz sua{" "}
            <span className="bg-gradient-to-r from-blue-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              corretora crescer
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-2xl text-lg text-white/65 sm:text-xl"
          >
            Clientes, apólices, atendimento e vendas em um só lugar. Pare de perder renovações e
            tempo com planilhas — com a sofisticação de um produto enterprise.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/cadastro"
              className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-[0_8px_30px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Começar grátis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              <MessageCircle className="size-4 text-emerald-400" /> Falar com vendas
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="mt-5 flex items-center gap-2 text-sm text-white/45"
          >
            <CheckCircle2 className="size-4 text-emerald-400" /> Teste grátis · sem cartão de crédito
          </motion.p>

          {/* Mockup espiando */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-16 w-full max-w-5xl"
          >
            <div className="absolute -inset-x-10 -top-8 bottom-0 -z-10 rounded-full bg-blue-600/20 blur-[90px]" />
            <div className="overflow-hidden rounded-t-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl backdrop-blur">
              <div className="rounded-t-xl bg-[#0c1322]">
                <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
                  <span className="size-2.5 rounded-full bg-red-400/70" />
                  <span className="size-2.5 rounded-full bg-amber-400/70" />
                  <span className="size-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="grid grid-cols-[140px_1fr] text-left">
                  {/* sidebar */}
                  <div className="hidden space-y-1 border-r border-white/5 p-3 sm:block">
                    {[LayoutDashboard, KanbanSquare, UserSquare2, ShieldCheck, CalendarDays, BarChart3].map(
                      (Icon, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
                            i === 0 ? "bg-blue-600/20 text-blue-200" : "text-white/40",
                          )}
                        >
                          <Icon className="size-3.5" />
                          <span className="h-2 w-12 rounded bg-white/15" />
                        </div>
                      ),
                    )}
                  </div>
                  {/* conteúdo */}
                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {STATS.slice(0, 3).map((s) => (
                        <div key={s.label} className="rounded-lg border border-white/5 bg-white/5 p-3">
                          <p className="text-base font-bold text-blue-300">{s.value}</p>
                          <p className="mt-0.5 text-[10px] leading-tight text-white/40">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex h-24 items-end gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                      {[40, 65, 50, 80, 60, 95, 72].map((h, i) => (
                        <motion.span
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: 0.7 + i * 0.06, duration: 0.5 }}
                          className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-sky-400"
                        />
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {["Apólice renovada — Auto", "Novo lead — Vida"].map((t) => (
                        <div
                          key={t}
                          className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                        >
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                          <span className="text-xs text-white/60">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070b15] to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* Dores */}
      <section className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
            O problema
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Gerir uma corretora não precisa ser um caos
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Reconhece alguma dessas situações? Você não está sozinho — e dá para resolver.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PAINS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="group h-full rounded-2xl bg-gradient-to-b from-slate-200/80 to-transparent p-px transition-all duration-300 hover:-translate-y-1 hover:from-red-300">
                <div className="h-full rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/15 to-red-500/5 text-red-500">
                    <AlertTriangle className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              A solução
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo o que a sua corretora precisa, num só sistema
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Do primeiro contato à renovação — com a operação inteira conectada.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 0.07}>
                <div className="group h-full rounded-2xl bg-gradient-to-b from-slate-200/80 to-transparent p-px transition-all duration-300 hover:-translate-y-1.5 hover:from-blue-400 hover:shadow-xl hover:shadow-blue-600/10">
                  <div className="h-full rounded-2xl bg-white p-6">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Simples
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Comece em 3 passos</h2>
        </Reveal>
        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          <div className="pointer-events-none absolute inset-x-[16%] top-7 hidden h-px bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12} className="relative text-center md:text-left">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-600/25 md:mx-0">
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Vídeo demo */}
      <section className="relative overflow-hidden bg-[#070b15] py-24 text-white lg:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="bg-grid absolute inset-0 opacity-[0.04]" />
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-5">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Veja em 2 minutos</h2>
            <p className="mt-3 text-lg text-white/60">
              Um tour rápido pelo sistema, do funil de vendas à renovação de apólices.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            {/* Substitua por um embed de YouTube/Loom quando o vídeo estiver pronto. */}
            <div className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-900/40 to-[#0e1626] shadow-2xl">
              <div className="bg-grid absolute inset-0 opacity-[0.05]" />
              <button className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="relative flex size-20 items-center justify-center rounded-full bg-blue-600 shadow-xl shadow-blue-600/40 transition-transform group-hover:scale-110">
                  <span className="absolute inset-0 animate-ping rounded-full bg-blue-600/40" />
                  <Play className="relative size-8 translate-x-0.5 fill-white" />
                </span>
                <span className="text-sm font-medium text-white/70">Assistir à demonstração</span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Números */}
      <section className="relative overflow-hidden bg-[#070b15] py-20 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 size-[360px] rounded-full bg-blue-600/15 blur-[100px]" />
          <div className="absolute -right-20 bottom-0 size-[360px] rounded-full bg-indigo-600/15 blur-[100px]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <p className="bg-gradient-to-r from-blue-300 to-sky-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
                {s.value}
              </p>
              <p className="mt-2 text-sm text-white/55">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-slate-50 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Planos
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Preços que cabem na sua corretora
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Comece grátis. Faça upgrade quando crescer. Cancele quando quiser.
            </p>
          </Reveal>
          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {PRICING.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1} className={cn(plan.highlight && "lg:-mt-4")}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-3xl p-px transition-all duration-300",
                    plan.highlight
                      ? "bg-gradient-to-b from-blue-500 to-indigo-600 shadow-2xl shadow-blue-600/25"
                      : "bg-slate-200/80 hover:-translate-y-1 hover:shadow-xl",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-full flex-col rounded-3xl p-7",
                      plan.highlight ? "bg-[#0b1220] text-white" : "bg-white",
                    )}
                  >
                    {plan.highlight && (
                      <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                        <Star className="size-3 fill-white" /> Mais popular
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className={cn("mt-1 text-sm", plan.highlight ? "text-white/60" : "text-slate-500")}>
                      {plan.tagline}
                    </p>
                    <div className="mt-5 flex items-end gap-1">
                      <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                      <span className={cn("mb-1 text-sm", plan.highlight ? "text-white/50" : "text-slate-500")}>
                        {plan.period}
                      </span>
                    </div>
                    <ul className="mt-6 space-y-3 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              plan.highlight ? "text-blue-400" : "text-emerald-500",
                            )}
                          />
                          <span className={plan.highlight ? "text-white/80" : "text-slate-700"}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/cadastro"
                      className={cn(
                        "mt-auto inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all",
                        plan.highlight
                          ? "bg-white text-blue-700 hover:bg-blue-50"
                          : "border border-slate-300 text-slate-900 hover:border-blue-400 hover:bg-blue-50",
                      )}
                    >
                      Começar grátis
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            Precisa de algo sob medida?{" "}
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
              Fale com nosso time
            </a>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-24 lg:py-32">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Dúvidas
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div
                key={item.q}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white transition-colors",
                  open ? "border-blue-200 shadow-sm" : "border-slate-200",
                )}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-medium">{item.q}</span>
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full transition-all",
                      open ? "rotate-180 bg-blue-600 text-white" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </motion.div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-[#070b15] px-8 py-16 text-center text-white shadow-2xl lg:px-16 lg:py-24">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="bg-grid absolute inset-0 opacity-[0.06]" />
              <motion.div
                className="absolute -left-10 top-0 size-[360px] rounded-full bg-blue-600/30 blur-[100px]"
                animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -right-10 bottom-0 size-[360px] rounded-full bg-indigo-600/30 blur-[100px]"
                animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Pronto para profissionalizar a sua corretora?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
                Comece o teste grátis agora ou fale com nosso time. Leva poucos minutos.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/cadastro"
                  className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-[0_8px_30px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5 hover:bg-blue-500"
                >
                  Começar grátis{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  <MessageCircle className="size-4 text-emerald-400" /> Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-900 text-white">
                  <Shield className="size-4" />
                </span>
                <span className="font-semibold">{brand}</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                A plataforma completa para a sua corretora de seguros.
              </p>
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
        </div>
        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {brand}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
