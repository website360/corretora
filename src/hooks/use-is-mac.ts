"use client";

import * as React from "react";

/**
 * Detecta se o usuário está em macOS/iOS, para exibir o símbolo de atalho
 * correto (⌘ no Mac, Ctrl nos demais). Começa como `false` (igual ao SSR)
 * e atualiza após montar, evitando hydration mismatch.
 */
export function useIsMac() {
  const [isMac, setIsMac] = React.useState(false);
  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    const src = navigator.platform || navigator.userAgent || "";
    setIsMac(/mac|iphone|ipad|ipod/i.test(src));
  }, []);
  return isMac;
}
