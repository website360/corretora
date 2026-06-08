import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Shield } from "lucide-react";
import { env } from "@/config/env";

const HIGHLIGHTS = [
  "Helpdesk e atendimento ao cliente em tempo real",
  "Gestão completa de clientes, apólices e renovações",
  "Multi-tenant seguro com controle de acesso por função",
  "Agenda, tarefas e automações em um só lugar",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1220] p-12 text-white lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div
          className="pointer-events-none absolute -left-24 top-1/3 size-[460px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)" }}
        />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#1e3a8a]">
            <Shield className="size-5" />
          </span>
          <span className="text-lg font-semibold">{env.appName}</span>
        </Link>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              A plataforma completa para a sua corretora de seguros.
            </h2>
            <p className="text-white/60">
              Centralize atendimento, clientes e operação com a sofisticação de um produto
              enterprise.
            </p>
          </div>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} {env.appName}. Todos os direitos reservados.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
