"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { calendarService } from "@/services/calendar.service";
import { usersService } from "@/services/users.service";
import { customersService } from "@/services/customers.service";
import { carriersService } from "@/services/carriers.service";
import { productsService } from "@/services/products.service";
import { contractsService } from "@/services/contracts.service";
import { quotesService } from "@/services/quotes.service";
import { tagsService } from "@/services/tags.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import { useDirectoryStore } from "@/stores/directory-store";
import { BoardColumnPicker, defaultBoardId } from "@/modules/tickets/board-column-picker";
import { EVENT_MODALITY_META } from "@/config/domain";
import type { CalendarEvent, EventModality, TicketSubjectType } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewEventDialog({
  open,
  onOpenChange,
  defaultDate,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
  event?: CalendarEvent | null;
  /** Pre-selects the "tipo de evento" when creating from the Criar menu. */
  initialSubjectType?: TicketSubjectType;
  onSaved?: (created?: CalendarEvent) => void;
}) {
  const { user } = useSession();
  const editing = Boolean(event);
  const { data: users } = useAsyncData(() => usersService.list());
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: carriers } = useAsyncData(() => carriersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: contracts } = useAsyncData(() => contractsService.list());
  const { data: quotes } = useAsyncData(() => quotesService.list());
  const { data: tags } = useAsyncData(() => tagsService.list("events"));

  const [title, setTitle] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("10:00");
  const [location, setLocation] = React.useState("");
  const [modality, setModality] = React.useState<EventModality>("in_person");
  const [boardId, setBoardId] = React.useState("");
  const [columnId, setColumnId] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [carrierId, setCarrierId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [contractId, setContractId] = React.useState("");
  const [quoteId, setQuoteId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState(user.id);
  const [participantIds, setParticipantIds] = React.useState<string[]>([]);
  const [tagSel, setTagSel] = React.useState<string[]>([]);
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (event) {
      const s = new Date(event.starts_at);
      const e = new Date(event.ends_at);
      setTitle(event.title);
      setStartDate(format(s, "yyyy-MM-dd"));
      setStartTime(format(s, "HH:mm"));
      setEndDate(format(e, "yyyy-MM-dd"));
      setEndTime(format(e, "HH:mm"));
      setLocation(event.location ?? "");
      setModality(event.modality ?? "in_person");
      setCustomerId(event.customer_id ?? "");
      setCarrierId(event.carrier_id ?? "");
      setProductId(event.product_id ?? "");
      setContractId(event.contract_id ?? "");
      setQuoteId(event.quote_id ?? "");
      setOwnerId(event.owner_id);
      setParticipantIds(event.participant_ids ?? []);
      setTagSel(event.tags ?? []);
      setDescription(event.description ?? "");
    } else {
      const d = format(defaultDate, "yyyy-MM-dd");
      setTitle("");
      setStartDate(d);
      setStartTime("09:00");
      setEndDate(d);
      setEndTime("10:00");
      setLocation("");
      setModality("in_person");
      setCustomerId("");
      setCarrierId("");
      setProductId("");
      setContractId("");
      setQuoteId("");
      setOwnerId(user.id);
      setParticipantIds([]);
      setTagSel([]);
      setDescription("");
    }
    // Kanban placement: keep the event's board/column, else default board + first column.
    const { taskBoards, taskColumns } = useDirectoryStore.getState();
    const bId = event?.board_id ?? defaultBoardId(taskBoards) ?? "";
    setBoardId(bId);
    const firstCol = taskColumns
      .filter((c) => c.board_id === bId)
      .sort((a, b) => a.position - b.position)[0];
    setColumnId(event?.column_id ?? firstCol?.id ?? "");
  }, [open, defaultDate, user.id, event]);

  async function save() {
    if (!title.trim()) return;
    const starts = new Date(`${startDate}T${startTime}:00`);
    const ends = new Date(`${endDate}T${endTime}:00`);
    if (ends < starts) {
      toast.error("O término deve ser depois do início.");
      return;
    }
    setSaving(true);
    // O evento é sempre interno; os itens (cliente, seguradora, produto,
    // contrato, orçamento) são apenas menções opcionais.
    const payload = {
      title,
      description: description || null,
      modality,
      subject_type: "internal" as const,
      board_id: boardId || null,
      column_id: columnId || null,
      customer_id: customerId || null,
      carrier_id: carrierId || null,
      product_id: productId || null,
      contract_id: contractId || null,
      quote_id: quoteId || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      owner_id: ownerId || user.id,
      participant_ids: participantIds,
      tags: tagSel,
      location: location || null,
    };
    try {
      let created: CalendarEvent | undefined;
      if (editing) {
        await calendarService.update(event!.id, payload);
        toast.success("Evento atualizado");
      } else {
        created = await calendarService.create({
          ...payload,
          type: "meeting",
          all_day: false,
          created_by: user.id,
        });
        toast.success("Evento criado");
      }
      onOpenChange(false);
      onSaved?.(created);
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao salvar evento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>Agende uma reunião, compromisso ou lembrete.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">Título *</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          {/* Início / Fim — empilhados para o seletor de data não cortar o ícone */}
          <div className="space-y-2">
            <Label>Início</Label>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Local / Modalidade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ev-loc">Local</Label>
              <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={modality} onValueChange={(v) => setModality(v as EventModality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_MODALITY_META) as EventModality[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {EVENT_MODALITY_META[m].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <BoardColumnPicker
            boardId={boardId}
            columnId={columnId}
            onBoardChange={setBoardId}
            onColumnChange={setColumnId}
          />

          {(
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Mencione os itens relacionados (opcional — combine cliente, seguradora,
                produto, contrato e orçamento).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Combobox
                    options={(customers ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    value={customerId}
                    onChange={(v) => setCustomerId(v)}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar cliente..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seguradora</Label>
                  <Combobox
                    options={(carriers ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    value={carrierId}
                    onChange={(v) => {
                      setCarrierId(v);
                      if (v && productId) {
                        const prod = (products ?? []).find((p) => p.id === productId);
                        if (prod && prod.carrier_id && prod.carrier_id !== v) setProductId("");
                      }
                    }}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar seguradora..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Combobox
                    options={(products ?? [])
                      .filter((p) => !carrierId || !p.carrier_id || p.carrier_id === carrierId)
                      .map((p) => ({ value: p.id, label: p.name }))}
                    value={productId}
                    onChange={(v) => setProductId(v)}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar produto..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contrato</Label>
                  <Combobox
                    options={(contracts ?? []).map((c) => {
                      const who = (customers ?? []).find((cu) => cu.id === c.customer_id)?.name;
                      const label = [who, c.policy_number ? `Apólice ${c.policy_number}` : null]
                        .filter(Boolean)
                        .join(" · ");
                      return { value: c.id, label: label || "Contrato" };
                    })}
                    value={contractId}
                    onChange={(v) => setContractId(v)}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar contrato..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orçamento</Label>
                  <Combobox
                    options={(quotes ?? []).map((q) => {
                      const who = (customers ?? []).find((cu) => cu.id === q.customer_id)?.name;
                      const label = [`#${q.number}`, q.title || who].filter(Boolean).join(" · ");
                      return { value: q.id, label };
                    })}
                    value={quoteId}
                    onChange={(v) => setQuoteId(v)}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar orçamento..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Responsável / Envolvidos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Combobox
                options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
                value={ownerId}
                onChange={(v) => setOwnerId(v || user.id)}
                placeholder="Selecione"
                searchPlaceholder="Buscar usuário..."
              />
            </div>
            <div className="space-y-2">
              <Label>Envolvidos</Label>
              <MultiSelect
                options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
                values={participantIds}
                onChange={setParticipantIds}
                placeholder="Nenhum"
                searchPlaceholder="Buscar usuário..."
                triggerClassName="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <MultiSelect
              options={(tags ?? []).map((t) => ({ value: t.name, label: t.name }))}
              values={tagSel}
              onChange={setTagSel}
              placeholder="Nenhuma"
              searchPlaceholder="Buscar tag..."
              emptyText="Nenhuma tag. Crie em Configurações → Etiquetas."
              triggerClassName="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-desc">Descrição</Label>
            <Textarea
              id="ev-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">Criado por {user.name}.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!title.trim()}>
            {editing ? "Salvar alterações" : "Criar evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
