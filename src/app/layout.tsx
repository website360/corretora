import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito_Sans } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { PwaRegister } from "@/components/common/pwa-register";
import { env } from "@/config/env";
import "./globals.css";

const sans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${env.appName} — Plataforma para Corretoras de Seguros`,
    template: `%s · ${env.appName}`,
  },
  description:
    "Plataforma SaaS multi-tenant para corretoras de seguros: clientes, tickets, agenda, atendimento e gestão em um só lugar.",
  applicationName: env.appName,
  appleWebApp: { capable: true, title: env.appName, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070d1c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} font-sans`} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
        <PwaRegister />
      </body>
    </html>
  );
}
