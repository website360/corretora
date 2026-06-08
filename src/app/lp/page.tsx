import type { Metadata } from "next";
import { env } from "@/config/env";
import { LandingPage } from "@/modules/marketing/landing-page";

export const metadata: Metadata = {
  title: `${env.appName} — O sistema completo para corretoras de seguros`,
  description:
    "CRM, apólices, atendimento, agenda e funil de vendas em um só lugar. Pare de perder renovações e organize sua corretora. Comece grátis.",
  openGraph: {
    title: `${env.appName} — O sistema completo para corretoras de seguros`,
    description:
      "Clientes, apólices, atendimento e funil de vendas num só lugar. Comece grátis, sem cartão.",
    type: "website",
  },
};

export default function LpPage() {
  return <LandingPage />;
}
