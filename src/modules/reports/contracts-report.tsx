"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Download,
  DollarSign,
  FileText,
  Package,
  Percent,
  Printer,
  Search,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { contractsService } from "@/services/contracts.service";
import { customersService } from "@/services/customers.service";
import { productsService } from "@/services/products.service";
import { carriersService } from "@/services/carriers.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { CONTRACT_STATUS_META, TONE_BADGE_CLASS } from "@/config/domain";
import { formatCompact, formatCurrency, formatShortDate } from "@/utils/format";
import { toCsv, downloadFile } from "@/utils/csv";
import { cn } from "@/lib/utils";
import type { Contract } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function money(v: number) {
  return v >= 100000 ? `R$ ${formatCompact(v)}` : formatCurrency(v);
}
function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

const ACTIVE = new Set(["active", "renewal"]);

export function ContractsReport() {
  const router = useRouter();
  const { data, loading } = useAsyncData(() => contractsService.list());
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: carriers } = useAsyncData(() => carriersService.list());

  const [search, setSearch] = React.useState("");
  const [clientes, setClientes] = React.useState<string[]>([]);
  const [produtos, setProdutos] = React.useState<string[]>([]);
  const [situacao, setSituacao] = React.useState<"all" | "active" | "inactive">("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const customerName = React.useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c.name || "Sem nome"])),
    [customers],
  );
  const productName = React.useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.name])),
    [products],
  );
  const carrierName = React.useMemo(
    () => new Map((carriers ?? []).map((c) => [c.id, c.name])),
    [carriers],
  );

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const from = dateFrom ? +new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? +new Date(`${dateTo}T23:59:59`) : null;
    return (data ?? []).filter((c) => {
      if (situacao === "active" && !ACTIVE.has(c.status)) return false;
      if (situacao === "inactive" && ACTIVE.has(c.status)) return false;
      if (clientes.length > 0 && !clientes.includes(c.customer_id)) return false;
      if (produtos.length > 0 && (!c.product_id || !produtos.includes(c.product_id))) return false;
      if (from || to) {
        if (!c.starts_at) return false;
        const t = +new Date(c.starts_at);
        if (from && t < from) return false;
        if (to && t > to) return false;
      }
      if (q) {
        const hay = `${c.policy_number ?? ""} ${customerName.get(c.customer_id) ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, situacao, clientes, produtos, dateFrom, dateTo, customerName]);

  const premiumTotal = filtered.reduce((s, c) => s + c.premium_cents, 0) / 100;
  const commissionTotal =
    filtered.reduce((s, c) => s + (c.premium_cents * (c.commission_percent ?? 0)) / 100, 0) / 100;

  function exportCsv() {
    if (filtered.length === 0) return toast.error("Nenhum contrato para exportar.");
    const headers = [
      "Cliente",
      "Apólice",
      "Produto",
      "Seguradora",
      "Início vigência",
      "Fim vigência",
      "Prêmio (R$)",
      "Comissão (%)",
      "Status",
    ];
    const rows = filtered.map((c) => [
      customerName.get(c.customer_id) ?? "",
      c.policy_number ?? "",
      c.product_id ? (productName.get(c.product_id) ?? "") : "",
      c.carrier_id ? (carrierName.get(c.carrier_id) ?? "") : "",
      c.starts_at ? formatShortDate(c.starts_at) : "",
      c.ends_at ? formatShortDate(c.ends_at) : "",
      (c.premium_cents / 100).toFixed(2).replace(".", ","),
      c.commission_percent != null ? String(c.commission_percent).replace(".", ",") : "",
      CONTRACT_STATUS_META[c.status].label,
    ]);
    downloadFile(toCsv(headers, rows), "relatorio-contratos.csv");
    toast.success(`${filtered.length} contrato(s) exportado(s).`);
  }

  function exportPdf() {
    if (filtered.length === 0) return toast.error("Nenhum contrato para exportar.");
    const rowsHtml = filtered
      .map((c) => {
        const prod = c.product_id ? (productName.get(c.product_id) ?? "—") : "—";
        const carr = c.carrier_id ? (carrierName.get(c.carrier_id) ?? "") : "";
        return `<tr>
          <td>${esc(customerName.get(c.customer_id) ?? "—")}${c.policy_number ? `<br><small>Apólice ${esc(c.policy_number)}</small>` : ""}</td>
          <td>${esc(prod)}${carr ? `<br><small>${esc(carr)}</small>` : ""}</td>
          <td>${c.starts_at ? formatShortDate(c.starts_at) : "?"} → ${c.ends_at ? formatShortDate(c.ends_at) : "?"}</td>
          <td>${c.premium_cents ? formatCurrency(c.premium_cents / 100) : "—"}</td>
          <td>${CONTRACT_STATUS_META[c.status].label}</td>
        </tr>`;
      })
      .join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Contratos</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px}
        h1{font-size:18px;margin:0 0 4px}
        .meta{color:#666;font-size:12px;margin-bottom:12px}
        .totals{font-size:13px;margin-bottom:10px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#f3f4f6}
        small{color:#666}
        @media print{button{display:none}}
      </style></head><body>
      <h1>Relatório de Contratos</h1>
      <div class="meta">Gerado em ${formatShortDate(new Date())}</div>
      <div class="totals">Contratos: <b>${filtered.length}</b> &middot; Prêmio total: <b>${formatCurrency(premiumTotal)}</b> &middot; Comissão estimada: <b>${formatCurrency(commissionTotal)}</b></div>
      <table><thead><tr><th>Cliente</th><th>Produto / Seguradora</th><th>Vigência</th><th>Prêmio</th><th>Status</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita pop-ups para exportar em PDF.");
    w.document.write(html);
    w.document.close();
  }

  const columns: ColumnDef<Contract>[] = [
    {
      id: "customer",
      header: "Cliente",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{customerName.get(row.original.customer_id) ?? "—"}</p>
          {row.original.policy_number && (
            <p className="truncate text-xs text-muted-foreground">
              Apólice {row.original.policy_number}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "product",
      header: "Produto / Seguradora",
      cell: ({ row }) => {
        const c = row.original;
        const prod = c.product_id ? productName.get(c.product_id) : null;
        const carr = c.carrier_id ? carrierName.get(c.carrier_id) : null;
        return (
          <div className="text-sm">
            <p>{prod ?? "—"}</p>
            {carr && <p className="text-xs text-muted-foreground">{carr}</p>}
          </div>
        );
      },
    },
    {
      id: "validity",
      header: "Vigência",
      cell: ({ row }) => {
        const c = row.original;
        if (!c.starts_at && !c.ends_at) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {c.starts_at ? formatShortDate(c.starts_at) : "?"} →{" "}
            {c.ends_at ? formatShortDate(c.ends_at) : "?"}
          </span>
        );
      },
    },
    {
      id: "premium",
      header: "Prêmio",
      cell: ({ row }) =>
        row.original.premium_cents ? (
          <span className="whitespace-nowrap font-medium">
            {formatCurrency(row.original.premium_cents / 100)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = CONTRACT_STATUS_META[row.original.status];
        return (
          <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
            {meta.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/relatorios">
          <ArrowLeft /> Voltar para relatórios
        </Link>
      </Button>

      <PageHeader
        title="Relatório de contratos"
        description="Filtre as apólices por cliente, situação, período e produto."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download /> CSV
            </Button>
            <Button variant="outline" onClick={exportPdf}>
              <Printer /> PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Contratos" value={String(filtered.length)} icon={FileText} />
        <StatCard label="Prêmio total" value={money(premiumTotal)} icon={DollarSign} />
        <StatCard label="Comissão estimada" value={money(commissionTotal)} icon={Percent} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Buscar por cliente ou apólice..."
            startIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <MultiSelect
          icon={<User className="size-4" />}
          options={(customers ?? []).map((c) => ({ value: c.id, label: c.name || "Sem nome" }))}
          values={clientes}
          onChange={setClientes}
          placeholder="Todos os clientes"
          searchPlaceholder="Buscar cliente..."
          allLabel="Todos"
        />
        <Select value={situacao} onValueChange={(v) => setSituacao(v as typeof situacao)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <MultiSelect
          icon={<Package className="size-4" />}
          options={(products ?? []).map((p) => ({ value: p.id, label: p.name }))}
          values={produtos}
          onChange={setProdutos}
          placeholder="Todos os produtos"
          searchPlaceholder="Buscar produto..."
          allLabel="Todos"
        />
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[150px]"
            title="Vigência — data inicial"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-[150px]"
            title="Vigência — data final"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(c) => router.push(`/contratos/${c.id}`)}
        emptyIcon={FileText}
        emptyTitle="Nenhum contrato"
        emptyDescription="Ajuste os filtros ou cadastre contratos."
      />
    </div>
  );
}
