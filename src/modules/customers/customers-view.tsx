"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  CheckCircle2,
  CircleDot,
  Copy,
  Download,
  Eye,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  SkipForward,
  SquareArrowOutUpRight,
  Tag as TagIcon,
  Trash2,
  Upload,
  User as UserIcon,
  UserSquare2,
} from "lucide-react";
import { toast } from "sonner";
import { customersService } from "@/services/customers.service";
import { tagsService } from "@/services/tags.service";
import { InlineSelect, type InlineOption } from "@/components/common/inline-select";
import { InlineTags } from "@/components/common/inline-tags";
import { plansService } from "@/services/plans.service";
import { effectiveLimits, withinLimit } from "@/services/billing.service";
import { useSession } from "@/contexts/session-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory } from "@/stores/directory-store";
import { findUser } from "@/services/lookup";
import { formatDocument, formatPhone } from "@/utils/format";
import { toCsv, parseCsv, downloadFile } from "@/utils/csv";
import { cn, normalizeEmail, titleCase } from "@/lib/utils";
import { TONE_BADGE_CLASS, TONE_DOT_CLASS } from "@/config/domain";
import type { Customer, CustomerKind, EntityStatus, PersonType, StageColor } from "@/types/domain";

const STATUS_OPTIONS: InlineOption[] = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];
import {
  CUSTOMER_COLUMNS,
  isLockedCustomerColumn,
  useCustomerColumnsStore,
  type CustomerColumnId,
} from "@/stores/customer-columns-store";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { ColumnsMenu } from "@/components/common/columns-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { UserAvatar } from "@/components/common/user-avatar";
import { CustomerFormDialog } from "@/modules/customers/customer-form-dialog";
import { CustomerDrawer } from "@/modules/customers/customer-drawer";

const COLUMN_LABELS: Record<CustomerColumnId, string> = Object.fromEntries(
  CUSTOMER_COLUMNS.map((c) => [c.id, c.label]),
) as Record<CustomerColumnId, string>;

/** What to do with rows that match an existing contact. */
type DupStrategy = "skip" | "overwrite" | "duplicate";

type ImportPayload = Omit<Customer, "id" | "company_id" | "created_at">;

interface ImportRow {
  payload: ImportPayload;
  existingId: string | null;
}

interface ImportJob {
  phase: "confirm" | "running" | "done";
  rows: ImportRow[];
  newCount: number;
  dupCount: number;
  remaining: number;
  strategy: DupStrategy;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  limited: number;
}

export function CustomersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  useDirectory();
  const { data, loading, refetch } = useAsyncData(() => customersService.list());
  const { data: tags } = useAsyncData(() => tagsService.list("customers"));
  const { data: plans } = useAsyncData(() => plansService.list());
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [tagSel, setTagSel] = React.useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [viewCustomer, setViewCustomer] = React.useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Customer | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setDialogOpen(true);
  }, [searchParams]);

  const tagColor = React.useMemo(() => {
    const map = new Map<string, StageColor>((tags ?? []).map((t) => [t.name, t.color]));
    return (name: string): StageColor => map.get(name) ?? "neutral";
  }, [tags]);


  // Plan limit on contacts (null = unlimited).
  const contactLimit = plans ? effectiveLimits(user.company, plans).maxContacts : null;
  const contactsUsed = (data ?? []).length;
  const canAddContact = withinLimit(contactsUsed, contactLimit);

  function guardNewContact() {
    if (!canAddContact) {
      toast.error(
        `Limite de ${contactLimit} contatos do seu plano atingido. Faça upgrade para adicionar mais.`,
      );
      return;
    }
    setDialogOpen(true);
  }

  const filtered = React.useMemo(() => {
    const list = data ?? [];
    const q = search.toLowerCase().trim();
    return list
      .filter((c) => {
        // Contatos = clientes apenas; leads vivem no kanban de Leads.
        if (c.kind !== "client") return false;
        if (statuses.length > 0 && !statuses.includes(c.status)) return false;
        if (tagSel.length > 0 && !tagSel.some((t) => c.tags.includes(t))) return false;
        if (
          q &&
          !(
            c.name.toLowerCase().includes(q) ||
            c.document.includes(q) ||
            c.email?.toLowerCase().includes(q)
          )
        )
          return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [data, search, statuses, tagSel]);

  const columnDefs: Record<CustomerColumnId, ColumnDef<Customer>> = {
    name: {
      accessorKey: "name",
      header: "Contato",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {c.person_type === "company" ? (
                <Building2 className="size-4" />
              ) : (
                <UserIcon className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              {c.document && (
                <p className="truncate text-xs text-muted-foreground">
                  {formatDocument(c.document)}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    contact: {
      id: "contact",
      header: "E-mail / Telefone",
      cell: ({ row }) => {
        const { email, phone } = row.original;
        return (
          <div className="text-sm">
            {email && <p>{email}</p>}
            {phone && <p className="text-xs text-muted-foreground">{formatPhone(phone)}</p>}
          </div>
        );
      },
    },
    tags: {
      id: "tags",
      header: "Etiquetas",
      cell: ({ row }) => (
        <InlineTags
          value={row.original.tags}
          options={(tags ?? []).map((t) => t.name)}
          colorOf={tagColor}
          title="Editar etiquetas"
          onChange={async (next) => {
            await customersService.update(row.original.id, { tags: next });
            refetch();
          }}
        >
          <div className="flex flex-wrap gap-1">
            {row.original.tags.length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              <>
                {row.original.tags.slice(0, 2).map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className={cn("capitalize", TONE_BADGE_CLASS[tagColor(t)])}
                  >
                    {t}
                  </Badge>
                ))}
                {row.original.tags.length > 2 && (
                  <Badge variant="outline">+{row.original.tags.length - 2}</Badge>
                )}
              </>
            )}
          </div>
        </InlineTags>
      ),
    },
    owner: {
      id: "owner",
      header: "Responsável",
      cell: ({ row }) => {
        const owner = findUser(row.original.owner_id);
        if (!owner) return null;
        return (
          <div className="flex items-center gap-2">
            <UserAvatar name={owner.name} src={owner.avatar_url} className="size-7" />
            <span className="text-sm">{owner.name}</span>
          </div>
        );
      },
    },
    status: {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <InlineSelect
          value={row.original.status}
          options={STATUS_OPTIONS}
          title="Trocar status"
          onChange={async (v) => {
            await customersService.update(row.original.id, { status: v as EntityStatus });
            refetch();
          }}
        >
          {row.original.status === "active" ? (
            <Badge variant="success">Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </InlineSelect>
      ),
    },
  };

  const actionsColumn: ColumnDef<Customer> = {
    id: "actions",
    header: "Ações",
    meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Ações">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/clientes/${c.id}`)}>
                <SquareArrowOutUpRight /> Abrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewCustomer(c)}>
                <Eye /> Visualizar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(c)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  };

  const order = useCustomerColumnsStore((s) => s.order);
  const hidden = useCustomerColumnsStore((s) => s.hidden);
  const toggle = useCustomerColumnsStore((s) => s.toggle);
  const reorder = useCustomerColumnsStore((s) => s.reorder);
  const reset = useCustomerColumnsStore((s) => s.reset);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Before mount use defaults (matches SSR), then apply the saved preference.
  const effOrder = mounted ? order : (CUSTOMER_COLUMNS.map((c) => c.id) as CustomerColumnId[]);
  const effHidden = mounted ? hidden : [];
  const visible = effOrder.filter((id) => isLockedCustomerColumn(id) || !effHidden.includes(id));
  const columns = [...visible.map((id) => columnDefs[id]), actionsColumn];

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [importJob, setImportJob] = React.useState<ImportJob | null>(null);
  const cancelImportRef = React.useRef(false);
  const [bulkDelete, setBulkDelete] = React.useState<{
    rows: Customer[];
    clear: () => void;
  } | null>(null);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const KIND_LABEL: Record<CustomerKind, string> = { lead: "Lead", client: "Cliente" };
  const PERSON_LABEL: Record<PersonType, string> = {
    individual: "Pessoa Física",
    company: "Pessoa Jurídica",
  };

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customersService.remove(deleteTarget.id);
      toast.success("Contato movido para a lixeira");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir o contato");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    if (!bulkDelete) return;
    setBulkDeleting(true);
    let ok = 0;
    let fail = 0;
    for (const c of bulkDelete.rows) {
      try {
        await customersService.remove(c.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkDeleting(false);
    toast.success(
      `${ok} contato(s) movido(s) para a lixeira${fail ? `, ${fail} com erro` : ""}.`,
    );
    bulkDelete.clear();
    setBulkDelete(null);
    refetch();
  }

  function exportCsv() {
    const list = filtered;
    if (list.length === 0) {
      toast.error("Nenhum contato para exportar.");
      return;
    }
    const headers = [
      "Tipo",
      "Pessoa",
      "Nome",
      "Documento",
      "Email",
      "Telefone",
      "Etiquetas",
      "Status",
      "Observacoes",
    ];
    const rows = list.map((c) => [
      KIND_LABEL[c.kind],
      PERSON_LABEL[c.person_type],
      c.name,
      c.document,
      c.email ?? "",
      c.phone ?? "",
      c.tags.join("; "),
      c.status === "active" ? "Ativo" : "Inativo",
      c.notes ?? "",
    ]);
    downloadFile(toCsv(headers, rows), "contatos.csv");
    toast.success(`${list.length} contato(s) exportado(s).`);
  }

  // Step 1 — parse the file, map rows, detect duplicates, then open the modal.
  async function prepareImport(file: File) {
    if (!canAddContact) {
      toast.error(
        `Limite de ${contactLimit} contatos do seu plano atingido. Faça upgrade para importar mais.`,
      );
      return;
    }
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) {
        toast.error("Planilha vazia ou sem linhas de dados.");
        return;
      }
      const header = rows[0]!.map((h) => h.trim().toLowerCase());
      const idx = (...names: string[]) =>
        header.findIndex((h) => names.some((n) => h.includes(n)));
      const col = {
        kind: idx("tipo", "classific"),
        person: idx("pessoa", "fisica", "juridica"),
        name: idx("nome", "razao", "contato"),
        document: idx("documento", "cpf", "cnpj", "doc"),
        email: idx("email", "e-mail"),
        phone: idx("telefone", "fone", "celular"),
        tags: idx("etiqueta", "tag"),
        status: idx("status", "situacao"),
        notes: idx("observ", "nota"),
      };
      const get = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");

      // Index existing contacts to detect duplicates (document → email → name).
      const existing = data ?? [];
      const byDoc = new Map<string, string>();
      const byEmail = new Map<string, string>();
      const byName = new Map<string, string>();
      for (const c of existing) {
        const d = (c.document ?? "").replace(/\D/g, "");
        if (d) byDoc.set(d, c.id);
        if (c.email) byEmail.set(c.email.toLowerCase(), c.id);
        if (c.name) byName.set(c.name.trim().toLowerCase(), c.id);
      }

      const parsed: ImportRow[] = [];
      let dupCount = 0;
      for (const row of rows.slice(1)) {
        const name = get(row, col.name);
        const document = get(row, col.document);
        const emailRaw = get(row, col.email);
        if (!name && !document && !emailRaw) continue; // skip blank lines
        const kindRaw = get(row, col.kind).toLowerCase();
        const personRaw = get(row, col.person).toLowerCase();
        const statusRaw = get(row, col.status).toLowerCase();
        const tagsRaw = get(row, col.tags);
        const email = emailRaw ? normalizeEmail(emailRaw) : null;
        const payload: ImportPayload = {
          kind: (/client|cliente/.test(kindRaw) ? "client" : "lead") as CustomerKind,
          person_type: (/jur|company|pj|empresa/.test(personRaw)
            ? "company"
            : "individual") as PersonType,
          name: titleCase(name),
          document,
          email,
          phone: get(row, col.phone) || null,
          birth_date: null,
          address: null,
          board_id: null,
          column_id: null,
          notes: get(row, col.notes) || null,
          tags: tagsRaw
            ? tagsRaw
                .split(/[;,]/)
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          owner_id: null,
          status: (/inativ|inactive/.test(statusRaw) ? "inactive" : "active") as
            | "active"
            | "inactive",
        };
        const d = document.replace(/\D/g, "");
        const existingId =
          (d && byDoc.get(d)) ||
          (email && byEmail.get(email)) ||
          byName.get(payload.name.toLowerCase()) ||
          null;
        if (existingId) dupCount++;
        parsed.push({ payload, existingId });
      }

      if (parsed.length === 0) {
        toast.error("Nenhum contato válido encontrado. Confira o cabeçalho da planilha.");
        return;
      }

      const remaining = contactLimit == null ? Infinity : contactLimit - contactsUsed;
      cancelImportRef.current = false;
      setImportJob({
        phase: "confirm",
        rows: parsed,
        newCount: parsed.length - dupCount,
        dupCount,
        remaining,
        strategy: "skip",
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        limited: 0,
      });
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    } finally {
      setImporting(false);
    }
  }

  // Step 2 — run the import with the chosen duplicate strategy, updating the bar.
  async function runImport() {
    setImportJob((j) => (j ? { ...j, phase: "running" } : j));
    const job = importJob;
    if (!job) return;
    const { rows, strategy, remaining } = job;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let limited = 0;

    for (const { payload, existingId } of rows) {
      if (cancelImportRef.current) break;
      try {
        if (existingId && strategy === "skip") {
          skipped++;
        } else if (existingId && strategy === "overwrite") {
          await customersService.update(existingId, payload);
          updated++;
        } else {
          // New contact (or duplicate kept) — counts against the plan limit.
          if (created >= remaining) {
            limited++;
          } else {
            await customersService.create(payload);
            created++;
          }
        }
      } catch {
        failed++;
      }
      processed++;
      setImportJob((j) =>
        j ? { ...j, processed, created, updated, skipped, failed, limited } : j,
      );
    }

    setImportJob((j) =>
      j ? { ...j, phase: "done", processed, created, updated, skipped, failed, limited } : j,
    );
    if (created > 0 || updated > 0) refetch();
  }

  function closeImport() {
    cancelImportRef.current = true;
    setImportJob(null);
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Contatos"
        description="Gerencie clientes e leads da sua corretora."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) prepareImport(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              loading={importing}
            >
              <Upload /> Importar
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Exportar
            </Button>
            <Button onClick={guardNewContact}>
              <Plus /> Novo contato
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Buscar por nome, documento ou e-mail..."
            startIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <MultiSelect
          icon={<CircleDot />}
          options={[
            { value: "active", label: "Ativo" },
            { value: "inactive", label: "Inativo" },
          ]}
          values={statuses}
          onChange={setStatuses}
          placeholder="Todos os status"
          searchPlaceholder="Status..."
          allLabel="Todos"
        />

        <MultiSelect
          icon={<TagIcon />}
          options={(tags ?? []).map((t) => ({ value: t.name, label: t.name }))}
          values={tagSel}
          onChange={setTagSel}
          placeholder="Todas as etiquetas"
          searchPlaceholder="Buscar etiqueta..."
          emptyText="Nenhuma etiqueta."
          allLabel="Todas"
        />

        <div className="ml-auto">
          <ColumnsMenu
            order={order}
            hidden={hidden}
            labels={COLUMN_LABELS}
            isLocked={(id) => isLockedCustomerColumn(id as CustomerColumnId)}
            toggle={(id) => toggle(id as CustomerColumnId)}
            reorder={(o) => reorder(o as CustomerColumnId[])}
            reset={reset}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(c) => router.push(`/clientes/${c.id}`)}
        emptyIcon={UserSquare2}
        emptyTitle="Nenhum contato encontrado"
        emptyDescription="Cadastre seu primeiro contato para começar."
        initialSort={[{ id: "name", desc: false }]}
        storageKey="customers"
        enableSelection
        getRowId={(c) => c.id}
        bulkActions={(selected, clear) => (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setBulkDelete({ rows: selected, clear })}
          >
            <Trash2 className="size-4" /> Excluir
          </Button>
        )}
      />

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultKind="client"
        onSaved={() => refetch()}
      />

      <CustomerDrawer
        customer={viewCustomer}
        open={viewCustomer !== null}
        onOpenChange={(o) => !o && setViewCustomer(null)}
        onChanged={() => refetch()}
        tagColor={tagColor}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir contato"
        description={
          <>
            O contato <strong>{deleteTarget?.name || "sem nome"}</strong> será removido
            permanentemente.
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      <ImportDialog job={importJob} setJob={setImportJob} onRun={runImport} onClose={closeImport} />

      <ConfirmDialog
        open={bulkDelete !== null}
        onOpenChange={(o) => !o && setBulkDelete(null)}
        title="Excluir contatos selecionados"
        description={
          <>
            <strong>{bulkDelete?.rows.length}</strong> contato(s) serão movidos para a lixeira.
          </>
        }
        confirmLabel="Excluir selecionados"
        variant="destructive"
        loading={bulkDeleting}
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}

const DUP_OPTIONS: {
  value: DupStrategy;
  label: string;
  description: string;
  icon: typeof SkipForward;
}[] = [
  {
    value: "skip",
    label: "Ignorar",
    description: "Mantém o contato atual e pula a linha duplicada.",
    icon: SkipForward,
  },
  {
    value: "overwrite",
    label: "Sobrescrever",
    description: "Atualiza o contato existente com os dados da planilha.",
    icon: Copy,
  },
  {
    value: "duplicate",
    label: "Manter os dois",
    description: "Cria um novo contato mesmo já existindo.",
    icon: Layers,
  },
];

function ImportDialog({
  job,
  setJob,
  onRun,
  onClose,
}: {
  job: ImportJob | null;
  setJob: React.Dispatch<React.SetStateAction<ImportJob | null>>;
  onRun: () => void;
  onClose: () => void;
}) {
  const open = job !== null;
  const pct = job && job.rows.length ? (job.processed / job.rows.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && job?.phase !== "running" && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {job && (
          <>
            <DialogHeader>
              <DialogTitle>
                {job.phase === "done" ? "Importação concluída" : "Importar contatos"}
              </DialogTitle>
              <DialogDescription>
                {job.phase === "confirm" &&
                  `${job.rows.length} linha(s) lidas — ${job.newCount} novo(s)` +
                    (job.dupCount ? `, ${job.dupCount} já existente(s).` : ".")}
                {job.phase === "running" && "Processando os contatos da planilha…"}
                {job.phase === "done" && "Resumo do que foi importado."}
              </DialogDescription>
            </DialogHeader>

            {/* Confirm phase — choose what to do with duplicates */}
            {job.phase === "confirm" && (
              <div className="space-y-4">
                {job.dupCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {job.dupCount} contato(s) já existe(m). O que deseja fazer?
                    </p>
                    <div className="space-y-2">
                      {DUP_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = job.strategy === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setJob((j) => (j ? { ...j, strategy: opt.value } : j))}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                              active
                                ? "border-primary bg-accent/40 ring-1 ring-primary"
                                : "hover:border-primary/40 hover:bg-accent/20",
                            )}
                          >
                            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.description}</p>
                            </div>
                            {active && <CheckCircle2 className="ml-auto size-4 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Nenhum contato duplicado. Tudo será importado como novo.
                  </p>
                )}
                {job.remaining !== Infinity && job.newCount > job.remaining && (
                  <p className="rounded-lg bg-warning/10 p-2 text-xs text-warning">
                    Seu plano permite mais {job.remaining} contato(s). Os excedentes não serão
                    importados.
                  </p>
                )}
              </div>
            )}

            {/* Running / done — progress bar + counters */}
            {(job.phase === "running" || job.phase === "done") && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {job.processed} de {job.rows.length}
                    </span>
                    <span className="font-medium tabular-nums">{Math.round(pct)}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Criados" value={job.created} />
                  <Stat label="Atualizados" value={job.updated} />
                  <Stat label="Ignorados" value={job.skipped} />
                  <Stat label="Com erro" value={job.failed} tone={job.failed ? "bad" : undefined} />
                  {job.limited > 0 && <Stat label="Fora do limite" value={job.limited} tone="bad" />}
                </div>
              </div>
            )}

            <DialogFooter>
              {job.phase === "confirm" && (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button onClick={onRun}>
                    <Upload className="size-4" /> Importar{" "}
                    {job.dupCount > 0 && job.strategy === "skip"
                      ? `${job.newCount} novo(s)`
                      : ""}
                  </Button>
                </>
              )}
              {job.phase === "running" && (
                <Button variant="outline" onClick={onClose}>
                  Parar
                </Button>
              )}
              {job.phase === "done" && <Button onClick={onClose}>Concluir</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "bad" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone === "bad" && "text-destructive")}>
        {value}
      </span>
    </div>
  );
}
