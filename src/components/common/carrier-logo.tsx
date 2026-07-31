"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Carrier logo com fallback para o ícone de escudo.
 *
 * NÃO buscar o logo em serviço externo aqui: a versão anterior caía no
 * `google.com/s2/favicons` quando a imagem falhava, e como o catálogo apontava
 * para o Clearbit (descontinuado), toda tela com seguradoras disparava dezenas
 * de requisições ao Google por usuário. Saindo todas do mesmo IP do escritório,
 * o Google passou a responder com o desafio "I'm not a robot".
 *
 * O logo é servido do nosso próprio storage — veja scripts/carrier-logos.mjs.
 */
export function CarrierLogo({ src, className }: { src?: string | null; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-card",
        className,
      )}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-contain p-1"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <ShieldCheck className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}
