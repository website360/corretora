"use client";

import * as React from "react";
import { useSession } from "@/contexts/session-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { companiesService } from "@/services/companies.service";
import { useViewCompanyStore } from "@/stores/view-company-store";
import { Combobox } from "@/components/ui/combobox";

/**
 * Filtro GLOBAL de empresa — visível só para o Super Admin. Permite ver o
 * sistema completo ("Todas as empresas") ou focar numa empresa específica.
 * Ao trocar, recarrega para reaplicar o escopo em todas as listas/diretório.
 */
export function CompanyFilter() {
  const { user } = useSession();
  const companyId = useViewCompanyStore((s) => s.companyId);
  const setCompanyId = useViewCompanyStore((s) => s.setCompanyId);
  const { data: companies } = useAsyncData(() => companiesService.list(), []);

  if (user.role !== "super_admin") return null;

  const options = [
    { value: "all", label: "Todas as empresas" },
    ...(companies ?? []).map((c) => ({ value: c.id, label: c.trade_name })),
  ];

  return (
    <div className="hidden w-52 md:block">
      <Combobox
        options={options}
        value={companyId ?? "all"}
        onChange={(v) => {
          const next = !v || v === "all" ? null : v;
          if (next === companyId) return;
          setCompanyId(next);
          window.location.reload();
        }}
        placeholder="Todas as empresas"
        searchPlaceholder="Filtrar empresa..."
      />
    </div>
  );
}
