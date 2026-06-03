"use client";

import * as React from "react";
import { Headset, Send } from "lucide-react";
import { toast } from "sonner";
import { findProduct, findUser } from "@/services/lookup";
import { useDirectory } from "@/stores/directory-store";
import { SERVICE_CHANNEL_META, TONE_BADGE_CLASS } from "@/config/domain";
import { formatSmartDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ServiceChannel, ServiceRecord } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHANNELS = Object.keys(SERVICE_CHANNEL_META) as ServiceChannel[];
const GENERIC = "__generic";

export interface ContractOption {
  value: string;
  label: string;
}

export function AtendimentoChat({
  records,
  loading,
  contractOptions,
  fixedContractId,
  contractLabel,
  onSend,
}: {
  records: ServiceRecord[];
  loading?: boolean;
  /** When provided, the composer shows an "Apólice" selector. */
  contractOptions?: ContractOption[];
  /** When set, every new message is linked to this contract (selector hidden). */
  fixedContractId?: string | null;
  /** Resolves a contract id to a short label for the bubble chip. */
  contractLabel?: (id: string) => string | null;
  onSend: (payload: {
    channel: ServiceChannel;
    notes: string;
    contract_id: string | null;
  }) => Promise<void>;
}) {
  useDirectory(); // ensure products are loaded so the service tag resolves
  const [channel, setChannel] = React.useState<ServiceChannel>("whatsapp");
  const [contractId, setContractId] = React.useState<string>(GENERIC);
  const [filter, setFilter] = React.useState<string>("all"); // all | generic | <contractId>
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Newest first — each atendimento shown as its own block.
  const visible = React.useMemo(() => {
    if (filter === "all") return records;
    if (filter === "generic") return records.filter((r) => !r.contract_id);
    return records.filter((r) => r.contract_id === filter);
  }, [records, filter]);

  // Filtering by a specific apólice pre-targets the composer to it.
  function changeFilter(v: string) {
    setFilter(v);
    setContractId(v === "all" || v === "generic" ? GENERIC : v);
  }

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend({
        channel,
        notes: text.trim(),
        contract_id: fixedContractId ?? (contractId === GENERIC ? null : contractId),
      });
      setText("");
    } catch {
      toast.error("Não foi possível registrar o atendimento.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      {/* Filter by apólice (only in the customer chat) */}
      {!fixedContractId && contractOptions && contractOptions.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Filtrar</span>
          <Select value={filter} onValueChange={changeFilter}>
            <SelectTrigger className="h-8 w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os atendimentos</SelectItem>
              <SelectItem value="generic">Genéricos (sem apólice)</SelectItem>
              {contractOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[460px] min-h-[200px] flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Headset}
            title="Nenhum atendimento"
            description="Use o campo abaixo para registrar o primeiro."
          />
        ) : (
          visible.map((r) => {
            const meta = SERVICE_CHANNEL_META[r.channel];
            const Icon = meta.icon;
            const author = findUser(r.author_id);
            const cLabel = r.contract_id && contractLabel ? contractLabel(r.contract_id) : null;
            const product = findProduct(r.product_id);
            return (
              <div key={r.id} className="rounded-xl border bg-card p-3.5 shadow-xs">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("h-5 gap-1 px-1.5", TONE_BADGE_CLASS[meta.tone])}
                  >
                    <Icon className="size-3" /> {meta.label}
                  </Badge>
                  {product && (
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {product.name}
                    </Badge>
                  )}
                  {cLabel && (
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {cLabel}
                    </Badge>
                  )}
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserAvatar name={author?.name} src={author?.avatar_url} className="size-5" />
                    {author?.name ?? "Atendente"} · {formatSmartDate(r.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{r.notes}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="space-y-2 border-t bg-muted/20 p-3">
        <div className="flex flex-wrap gap-2">
          <Select value={channel} onValueChange={(v) => setChannel(v as ServiceChannel)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {SERVICE_CHANNEL_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!fixedContractId && contractOptions && (
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue placeholder="Apólice (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GENERIC}>Genérico (sem apólice)</SelectItem>
                {contractOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            placeholder="Ex.: Atendi o cliente por WhatsApp e informei os dados do seguro de vida."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            className="flex-1 resize-none"
          />
          <Button onClick={send} loading={sending} disabled={!text.trim()}>
            <Send className="size-4" /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
