import type { MetadataRoute } from "next";
import { env } from "@/config/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${env.appName} — Corretora de Seguros`,
    short_name: env.appName,
    description:
      "Plataforma para corretoras de seguros: leads, contatos, orçamentos, contratos, agenda e atendimento.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
