"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Calculator,
  FileSignature,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { quotesService } from "@/services/quotes.service";
import { customersService } from "@/services/customers.service";
import { usersService } from "@/services/users.service";
import { contractsService } from "@/services/contracts.service";
import { contractAttachmentsService } from "@/services/contract-attachments.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import {
  QUOTE_ACTIVE_STATUSES,
  QUOTE_STATUS_META,
  TONE_BADGE_CLASS,
  TONE_DOT_CLASS,
} from "@/config/domain";
import { formatShortDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Customer, Quote, QuoteStatus, User } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InlineSelect, type InlineOption } from "@/components/common/inline-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuoteFormDialog } from "@/modules/quotes/quote-form-dialog";

// Inline status options exclude "Assinado" — that's reached by signing (→ Concluídos).
const STATUS_INLINE: InlineOption[] = QUOTE_ACTIVE_STATUSES.map((s) => ({
  value: s,
  label: QUOTE_STATUS_META[s].label,
  leading: <span className={cn("size-2 rounded-full", TONE_DOT_CLASS[QUOTE_STATUS_META[s].tone])} />,
}));

export function QuotesView() {
  const router = useRouter();
  const { user } = useSession();
  const clicksignOn = !!user.company.settings?.integrations?.clicksign?.apiToken;
  const { data, loading, refetch } = useAsyncData(() => quotesService.list());
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: users } = useAsyncData(() => usersService.list());
  const { data: contracts } = useAsyncData(() => contractsService.list());

  const [tab, setTab] = React.useState<"active" | "done">("active");
  const [view, setView] = React.useState<"list" | "board">("list");
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quote | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Quote | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [genTarget, setGenTarget] = React.useState<Quote | null>(null);
  const [signTarget, setSignTarget] = React.useState<Quote | null>(null);
  const [checkingId, setCheckingId] = React.useState<string | null>(null);

  async function checkSignature(q: Quote) {
    setCheckingId(q.id);
    try {
      const r = await quotesService.checkSignature(q.id);
      if (r.signed) {
        toast.success("Documento assinado! Contrato gerado.");
        refetch();
        if (r.contractId) router.push(`/contratos/${r.contractId}`);
      } else {
        toast("Ainda aguardando assinatura.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCheckingId(null);
    }
  }

  const customerName = React.useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c.name || "Sem nome"])),
    [customers],
  );
  const userName = React.useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u.name])),
    [users],
  );
  // Map a quote to its generated contract (for the "Concluídos" tab link).
  const contractByQuote = React.useMemo(
    () => new Map((contracts ?? []).filter((c) => c.quote_id).map((c) => [c.quote_id!, c.id])),
    [contracts],
  );

  const quotes = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data ?? []).filter((qt) => {
      if (!q) return true;
      const name = customerName.get(qt.customer_id)?.toLowerCase() ?? "";
      return name.includes(q) || (qt.title ?? "").toLowerCase().includes(q) || String(qt.number).includes(q);
    });
  }, [data, search, customerName]);

  const activeQuotes = quotes.filter((q) => q.status !== "won");
  const doneQuotes = quotes.filter((q) => q.status === "won");

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(q: Quote) {
    setEditing(q);
    setFormOpen(true);
  }
  async function setStatus(q: Quote, status: QuoteStatus) {
    await quotesService.setStatus(q.id, status);
    refetch();
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await quotesService.remove(deleteTarget.id);
      toast.success("Orçamento movido para a lixeira");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<Quote>[] = [
    {
      id: "number",
      header: "Nº",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.original.number}</span>
      ),
    },
    {
      id: "customer",
      header: "Cliente",
      accessorFn: (row) => customerName.get(row.customer_id) ?? "",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{customerName.get(row.original.customer_id) ?? "—"}</p>
          {row.original.title && (
            <p className="truncate text-xs text-muted-foreground">{row.original.title}</p>
          )}
        </div>
      ),
    },
    {
      id: "owner",
      header: "Responsável",
      cell: ({ row }) => (
        <InlineSelect
          value={row.original.owner_id ?? ""}
          options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
          title="Trocar responsável"
          onChange={async (v) => {
            await quotesService.update(row.original.id, { owner_id: v });
            refetch();
          }}
        >
          <span className="whitespace-nowrap text-sm">
            {row.original.owner_id ? (userName.get(row.original.owner_id) ?? "—") : "Atribuir"}
          </span>
        </InlineSelect>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = QUOTE_STATUS_META[row.original.status];
        if (row.original.status === "won") {
          return (
            <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
              {meta.label}
            </Badge>
          );
        }
        return (
          <InlineSelect
            value={row.original.status}
            options={STATUS_INLINE}
            title="Trocar status"
            onChange={(v) => setStatus(row.original, v as QuoteStatus)}
          >
            <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
              {meta.label}
            </Badge>
          </InlineSelect>
        );
      },
    },
    {
      id: "created",
      header: "Criado em",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatShortDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Ações">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              {clicksignOn &&
                row.original.status !== "won" &&
                row.original.status !== "awaiting_signature" && (
                  <DropdownMenuItem onClick={() => setSignTarget(row.original)}>
                    <Send /> Enviar para assinatura (ClickSign)
                  </DropdownMenuItem>
                )}
              {row.original.status === "awaiting_signature" && (
                <DropdownMenuItem
                  onClick={() => checkSignature(row.original)}
                  disabled={checkingId === row.original.id}
                >
                  <RefreshCw /> Verificar assinatura
                </DropdownMenuItem>
              )}
              {row.original.status !== "won" && (
                <DropdownMenuItem onClick={() => setGenTarget(row.original)}>
                  <FileSignature /> Marcar como assinado (manual)
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Concluídos = orçamentos assinados que viraram contrato.
  const doneColumns: ColumnDef<Quote>[] = [
    {
      id: "number",
      header: "Nº",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.original.number}</span>
      ),
    },
    {
      id: "customer",
      header: "Cliente",
      accessorFn: (row) => customerName.get(row.customer_id) ?? "",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{customerName.get(row.original.customer_id) ?? "—"}</p>
          {row.original.title && (
            <p className="truncate text-xs text-muted-foreground">{row.original.title}</p>
          )}
        </div>
      ),
    },
    {
      id: "owner",
      header: "Responsável",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm">
          {row.original.owner_id ? (userName.get(row.original.owner_id) ?? "—") : "—"}
        </span>
      ),
    },
    {
      id: "signed",
      header: "Assinado em",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.original.signed_at ? formatShortDate(row.original.signed_at) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Contrato",
      meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
      cell: ({ row }) => {
        const contractId = contractByQuote.get(row.original.id);
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              disabled={!contractId}
              onClick={() => contractId && router.push(`/contratos/${contractId}`)}
            >
              <SquareArrowOutUpRight className="size-4" /> Ver contrato
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <PageHeader
        title="Orçamentos"
        description="Propostas com opções comparáveis. A opção escolhida vira contrato ao assinar."
        actions={
          <Button onClick={openNew}>
            <Plus /> Novo orçamento
          </Button>
        }
      />

      {/* Guias: Em andamento × Concluídos */}
      <div className="inline-flex w-fit items-center rounded-lg border bg-muted/40 p-0.5">
        <button
          onClick={() => setTab("active")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            tab === "active" ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
        >
          Em andamento
        </button>
        <button
          onClick={() => setTab("done")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            tab === "done" ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
        >
          Concluídos ({doneQuotes.length})
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Buscar por cliente, título ou nº..."
            startIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab === "active" && (
          <div className="ml-auto inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                view === "list" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              <List className="size-4" /> Lista
            </button>
            <button
              onClick={() => setView("board")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                view === "board" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="size-4" /> Quadro
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "done" ? (
          <div className="h-full overflow-y-auto">
            <DataTable
              columns={doneColumns}
              data={doneQuotes}
              loading={loading}
              emptyIcon={Calculator}
              emptyTitle="Nenhum concluído"
              emptyDescription="Orçamentos assinados aparecem aqui, já como contrato."
              initialSort={[{ id: "customer", desc: false }]}
              storageKey="quotes-done"
            />
          </div>
        ) : view === "list" ? (
          <div className="h-full overflow-y-auto">
            <DataTable
              columns={columns}
              data={activeQuotes}
              loading={loading}
              onRowClick={(q) => openEdit(q)}
              emptyIcon={Calculator}
              emptyTitle="Nenhum orçamento"
              emptyDescription="Crie um orçamento para um cliente."
              initialSort={[{ id: "customer", desc: false }]}
              storageKey="quotes"
            />
          </div>
        ) : (
          <QuotesBoard
            quotes={activeQuotes}
            statuses={QUOTE_ACTIVE_STATUSES}
            customerName={customerName}
            userName={userName}
            onOpen={openEdit}
            onMove={(q, status) => setStatus(q, status)}
          />
        )}
      </div>

      <QuoteFormDialog open={formOpen} onOpenChange={setFormOpen} quote={editing} onSaved={refetch} />

      <GenerateContractDialog
        quote={genTarget}
        onOpenChange={(o) => !o && setGenTarget(null)}
        onDone={(contractId) => {
          setGenTarget(null);
          refetch();
          if (contractId) router.push(`/contratos/${contractId}`);
        }}
      />

      <SendSignatureDialog
        quote={signTarget}
        customers={customers ?? []}
        users={users ?? []}
        onOpenChange={(o) => !o && setSignTarget(null)}
        onDone={() => {
          setSignTarget(null);
          refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir orçamento"
        description="O orçamento será movido para a lixeira."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/* ─────────────────────────────── Quadro ─────────────────────────────── */

function QuotesBoard({
  quotes,
  statuses,
  customerName,
  userName,
  onOpen,
  onMove,
}: {
  quotes: Quote[];
  statuses: QuoteStatus[];
  customerName: Map<string, string>;
  userName: Map<string, string>;
  onOpen: (q: Quote) => void;
  onMove: (q: Quote, status: QuoteStatus) => void;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<QuoteStatus | null>(null);

  return (
    <div className="flex h-full min-h-0 gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => {
        const meta = QUOTE_STATUS_META[status];
        const cards = quotes.filter((q) => q.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(status);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setOverCol(null);
            }}
            onDrop={() => {
              const q = quotes.find((x) => x.id === dragId);
              setOverCol(null);
              setDragId(null);
              if (q && q.status !== status) onMove(q, status);
            }}
            className={cn(
              "flex h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-muted/30 transition-colors",
              overCol === status && "border-primary/50 bg-accent/40",
            )}
          >
            <div className="flex items-center gap-2 px-3 py-3">
              <span className={cn("size-2.5 rounded-full", TONE_DOT_CLASS[meta.tone])} />
              <h3 className="truncate text-sm font-semibold">{meta.label}</h3>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {cards.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-3">
              {cards.length === 0 ? (
                <div className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">
                  Arraste para cá
                </div>
              ) : (
                cards.map((q) => (
                  <button
                    key={q.id}
                    draggable
                    onDragStart={() => setDragId(q.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    onClick={() => onOpen(q)}
                    className="block w-full cursor-pointer rounded-xl border bg-card p-3 text-left shadow-xs transition-all hover:border-primary/30 hover:shadow-md active:cursor-grabbing"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">#{q.number}</span>
                    </div>
                    <p className="truncate text-sm font-medium">
                      {customerName.get(q.customer_id) ?? "—"}
                    </p>
                    {q.title && <p className="truncate text-xs text-muted-foreground">{q.title}</p>}
                    {q.owner_id && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {userName.get(q.owner_id) ?? ""}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────── Gerar contrato (assinatura manual) ─────────────────── */

function GenerateContractDialog({
  quote,
  onOpenChange,
  onDone,
}: {
  quote: Quote | null;
  onOpenChange: (open: boolean) => void;
  onDone: (contractId?: string) => void;
}) {
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [welcome, setWelcome] = React.useState(true);
  const [renewal, setRenewal] = React.useState(true);
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (quote) {
      setStartsAt("");
      setEndsAt("");
      setWelcome(true);
      setRenewal(true);
      setFile(null);
    }
  }, [quote]);

  async function confirm() {
    if (!quote) return;
    setSaving(true);
    try {
      const contract = await quotesService.generateContract(quote, {
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        createWelcome: welcome,
        createRenewal: renewal,
      });
      if (file) {
        try {
          await contractAttachmentsService.add(contract.id, file);
        } catch {
          toast.error("Contrato criado, mas não foi possível anexar o PDF.");
        }
      }
      toast.success("Contrato gerado a partir do orçamento");
      onDone(contract.id);
    } catch (e) {
      toast.error((e as Error).message ?? "Não foi possível gerar o contrato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(quote)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como assinado</DialogTitle>
          <DialogDescription>
            Confirma a assinatura (manual), cria o contrato a partir da opção selecionada e anexa a
            proposta. O contrato fica <strong>aguardando apenas a apólice</strong> (número e anexo).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Início da vigência</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim da vigência</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proposta / contrato assinado</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {file ? file.name : "Anexar proposta/PDF assinado"}
            </Button>
            <p className="text-xs text-muted-foreground">
              O arquivo é anexado ao contrato. A apólice (número e anexo) você adiciona depois.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">Criar tarefa de boas-vindas</span>
            <Switch checked={welcome} onCheckedChange={setWelcome} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Criar lembrete de renovação</p>
              <p className="text-xs text-muted-foreground">30 dias antes do fim (requer fim da vigência).</p>
            </div>
            <Switch checked={renewal} onCheckedChange={setRenewal} disabled={!endsAt} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} loading={saving}>
            <FileSignature className="size-4" /> Gerar contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────── Enviar para assinatura (ClickSign) ──────────────────── */

function readDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

function SendSignatureDialog({
  quote,
  customers,
  users,
  onOpenChange,
  onDone,
}: {
  quote: Quote | null;
  customers: Customer[];
  users: User[];
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (quote) setFile(null);
  }, [quote]);

  const customer = quote ? customers.find((c) => c.id === quote.customer_id) : undefined;
  const owner = quote?.owner_id ? users.find((u) => u.id === quote.owner_id) : undefined;

  async function send() {
    if (!quote) return;
    if (!file) {
      toast.error("Anexe o PDF que será assinado.");
      return;
    }
    if (!customer?.email) {
      toast.error("O cliente precisa ter e-mail cadastrado para assinar.");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await readDataUrl(file);
      const signers: { name: string; email: string; document?: string | null }[] = [
        { name: customer.name, email: customer.email, document: customer.document },
      ];
      if (owner?.email) signers.push({ name: owner.name, email: owner.email, document: null });
      await quotesService.sendForSignature(quote.id, {
        fileName: file.name,
        fileBase64: dataUrl,
        signers,
      });
      toast.success("Enviado para assinatura no ClickSign");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(quote)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar para assinatura</DialogTitle>
          <DialogDescription>
            O documento será enviado ao ClickSign. Quando assinado, o orçamento vira contrato
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Documento (PDF)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {file ? file.name : "Anexar PDF"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Signatários</Label>
            <div className="space-y-1.5 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>Cliente · {customer?.name ?? "—"}</span>
                <span className={cn("text-xs", customer?.email ? "text-muted-foreground" : "text-destructive")}>
                  {customer?.email ?? "sem e-mail"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Corretora · {owner?.name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">
                  {owner?.email ?? "sem responsável"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={send} loading={saving} disabled={!file || !customer?.email}>
            <Send className="size-4" /> Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
