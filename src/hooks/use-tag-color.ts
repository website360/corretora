"use client";

import * as React from "react";
import { tagsService } from "@/services/tags.service";
import { useAsyncData } from "@/hooks/use-async-data";

/**
 * Resolve a cor de uma etiqueta pelo catálogo da empresa; "neutral" quando a
 * etiqueta não está no catálogo.
 *
 * Use no COMPONENTE PAI, nunca dentro de um card que se repete: useAsyncData
 * não tem cache, então uma chamada por card viraria uma requisição por card.
 */
export function useTagColor(): (name: string) => string {
  const { data } = useAsyncData(() => tagsService.list());
  return React.useMemo(() => {
    const map = new Map<string, string>((data ?? []).map((t) => [t.name, t.color]));
    return (name: string) => map.get(name) ?? "neutral";
  }, [data]);
}
