import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * A diretiva que mais importa aqui é `script-src` SEM `data:`: em 2026-08 o
 * deploy foi adulterado e passou a servir um `<script src="data:...;base64,">`
 * que buscava o payload num contrato da BNB Chain (EtherHiding) e montava um
 * falso captcha. Esta política bloqueia exatamente esse vetor.
 *
 * `unsafe-inline` em script-src é necessário: o Next.js emite os scripts de
 * hidratação inline. `unsafe-eval` só em desenvolvimento, para o HMR.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://avatar.vercel.sh",
  "font-src 'self' data:",
  // Supabase (REST + realtime via websocket) e ViaCEP (busca de endereço).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://viacep.com.br",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // 2 anos. Sem `preload` de propósito: entrar na lista é difícil de reverter.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatar.vercel.sh" },
    ],
  },
};

export default nextConfig;
