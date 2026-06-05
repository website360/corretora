"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { ticketSchema, type TicketFormValues } from "@/lib/validations";
import { ticketsService } from "@/services/tickets.service";
import { usersService } from "@/services/users.service";
import { customersService } from "@/services/customers.service";
import { carriersService } from "@/services/carriers.service";
import { productsService } from "@/services/products.service";
import { contractsService } from "@/services/contracts.service";
import { quotesService } from "@/services/quotes.service";
import { userGroupsService, expandGroups } from "@/services/user-groups.service";
import { tagsService } from "@/services/tags.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import { useDirectoryStore } from "@/stores/directory-store";
import { BoardColumnPicker, defaultBoardId } from "@/modules/tickets/board-column-picker";
import { resolveSettings } from "@/config/sort";
import { TICKET_PRIORITY_META } from "@/config/domain";
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
import type { Ticket, TicketPriority, TicketSubjectType } from "@/types/domain";

export function TicketFormDialog({
  open,
  onOpenChange,
  ticket,
  initialSubjectType = "internal",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: Ticket | null;
  /** Pre-selects the "tipo de tarefa" when creating from the Criar menu. */
  initialSubjectType?: TicketSubjectType;
  onSaved?: (created?: Ticket) => void;
}) {
  const router = useRouter();
  const editing = Boolean(ticket);
  const { data: users } = useAsyncData(() => usersService.list());
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: carriers } = useAsyncData(() => carriersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: contracts } = useAsyncData(() => contractsService.list());
  const { data: quotes } = useAsyncData(() => quotesService.list());
  const { data: groups } = useAsyncData(() => userGroupsService.list());
  const { data: tags } = useAsyncData(() => tagsService.list("tasks"));
  const { user } = useSession();
  const taskTimeEnabled = resolveSettings(user.company).taskTimeEnabled;
  const [dueDate, setDueDate] = React.useState("");
  const [dueTime, setDueTime] = React.useState("");
  const [boardId, setBoardId] = React.useState("");
  const [columnId, setColumnId] = React.useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { priority: "medium", subject_type: "internal", tags: [], participant_ids: [] },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        title: ticket?.title ?? "",
        description: ticket?.description ?? "",
        priority: ticket?.priority ?? "medium",
        subject_type: ticket?.subject_type ?? initialSubjectType,
        customer_id: ticket?.customer_id ?? undefined,
        carrier_id: ticket?.carrier_id ?? undefined,
        product_id: ticket?.product_id ?? undefined,
        contract_id: ticket?.contract_id ?? undefined,
        quote_id: ticket?.quote_id ?? undefined,
        // New tasks default the responsável to the current user (changeable).
        assignee_id: ticket ? (ticket.assignee_id ?? undefined) : user.id,
        participant_ids: ticket?.participant_ids ?? [],
        tags: ticket?.tags ?? [],
        due_at: ticket?.due_at ?? undefined,
      });
      if (ticket?.due_at) {
        const d = new Date(ticket.due_at);
        setDueDate(format(d, "yyyy-MM-dd"));
        setDueTime(format(d, "HH:mm"));
      } else {
        // Nova tarefa: hora atual como padrão (a data fica em branco até escolher).
        setDueDate("");
        setDueTime(format(new Date(), "HH:mm"));
      }
      // Kanban placement: keep the task's board/column, else default board + first column.
      const { taskBoards, taskColumns } = useDirectoryStore.getState();
      const bId = ticket?.board_id ?? defaultBoardId(taskBoards) ?? "";
      setBoardId(bId);
      const firstCol = taskColumns
        .filter((c) => c.board_id === bId)
        .sort((a, b) => a.position - b.position)[0];
      setColumnId(ticket?.column_id ?? firstCol?.id ?? "");
    }
  }, [open, ticket, initialSubjectType, user.id, reset]);

  async function onSubmit(values: TicketFormValues) {
    const due_at = dueDate
      ? new Date(`${dueDate}T${dueTime || "09:00"}:00`).toISOString()
      : null;
    // A tarefa é sempre interna; os itens (cliente, seguradora, produto,
    // contrato, orçamento) são apenas menções opcionais, mantidas como vierem.
    const links = {
      customer_id: values.customer_id || undefined,
      carrier_id: values.carrier_id || undefined,
      product_id: values.product_id || undefined,
      contract_id: values.contract_id || undefined,
      quote_id: values.quote_id || undefined,
    };
    if (editing) {
      await ticketsService.update(ticket!.id, {
        ...values,
        ...links,
        subject_type: "internal",
        customer_id: links.customer_id ?? null,
        carrier_id: links.carrier_id ?? null,
        product_id: links.product_id ?? null,
        contract_id: links.contract_id ?? null,
        quote_id: links.quote_id ?? null,
        board_id: boardId || null,
        column_id: columnId || null,
        due_at,
        description: values.description ?? null,
      });
      // Registra no histórico o que mudou (incluindo remoções).
      const old = ticket!;
      const logs: Promise<void>[] = [];
      const oldTags = old.tags ?? [];
      const newTags = values.tags ?? [];
      newTags
        .filter((t) => !oldTags.includes(t))
        .forEach((t) => logs.push(ticketsService.logEvent(old.id, "tag_added", { tag: t })));
      oldTags
        .filter((t) => !newTags.includes(t))
        .forEach((t) => logs.push(ticketsService.logEvent(old.id, "tag_removed", { tag: t })));
      const oldParts = old.participant_ids ?? [];
      const newParts = values.participant_ids ?? [];
      newParts
        .filter((p) => !oldParts.includes(p))
        .forEach((p) => logs.push(ticketsService.logEvent(old.id, "participant_added", { to: p })));
      oldParts
        .filter((p) => !newParts.includes(p))
        .forEach((p) =>
          logs.push(ticketsService.logEvent(old.id, "participant_removed", { to: p })),
        );
      if ((values.assignee_id || null) !== (old.assignee_id || null)) {
        logs.push(ticketsService.logEvent(old.id, "assigned", { to: values.assignee_id ?? null }));
      }
      if (values.priority !== old.priority) {
        logs.push(ticketsService.logEvent(old.id, "priority_changed", { to: values.priority }));
      }
      if (old.due_at && !due_at) {
        logs.push(ticketsService.logEvent(old.id, "due_removed"));
      } else if ((due_at || null) !== (old.due_at || null)) {
        logs.push(ticketsService.logEvent(old.id, "due_changed", { to: due_at }));
      }
      if (values.title !== old.title) {
        logs.push(ticketsService.logEvent(old.id, "edited", { field: "título" }));
      }
      await Promise.all(logs);
      toast.success("Tarefa atualizada");
      onOpenChange(false);
      onSaved?.();
      router.refresh(); // revalida o contador de tarefas no menu (server)
      return;
    }
    const created = await ticketsService.create({
      ...values,
      ...links,
      subject_type: "internal",
      board_id: boardId || undefined,
      column_id: columnId || undefined,
      due_at,
      description: values.description ?? null,
    });
    toast.success(`Tarefa #${created.number} criada`);
    reset();
    onOpenChange(false);
    onSaved?.(created);
    router.push(`/tickets/${created.id}`);
    router.refresh(); // revalida o contador de tarefas no menu (server)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>
            Abra um atendimento, tarefa ou solicitação interna.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" placeholder="Resumo do atendimento" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as TicketPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TICKET_PRIORITY_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prazo — define a data em que a tarefa aparece no calendário */}
          <div className="space-y-2">
            <Label>Prazo (aparece no calendário)</Label>
            <div className={taskTimeEnabled ? "grid grid-cols-2 gap-2" : ""}>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              {taskTimeEnabled && (
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  disabled={!dueDate}
                />
              )}
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
                    value={watch("customer_id") ?? ""}
                    onChange={(v) => setValue("customer_id", v || undefined)}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar cliente..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seguradora</Label>
                  <Combobox
                    options={(carriers ?? []).map((c) => ({ value: c.id, label: c.name }))}
                    value={watch("carrier_id") ?? ""}
                    onChange={(v) => {
                      setValue("carrier_id", v || undefined);
                      // Drop a product that no longer belongs to the chosen carrier.
                      const pid = watch("product_id");
                      if (pid && v) {
                        const prod = (products ?? []).find((p) => p.id === pid);
                        if (prod && prod.carrier_id && prod.carrier_id !== v) {
                          setValue("product_id", undefined);
                        }
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
                      .filter((p) => {
                        const cid = watch("carrier_id");
                        return !cid || !p.carrier_id || p.carrier_id === cid;
                      })
                      .map((p) => ({ value: p.id, label: p.name }))}
                    value={watch("product_id") ?? ""}
                    onChange={(v) => setValue("product_id", v || undefined)}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar produto..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contrato</Label>
                  <Combobox
                    options={(contracts ?? []).map((c) => {
                      const who = (customers ?? []).find((cu) => cu.id === c.customer_id)?.name;
                      const carrier = (carriers ?? []).find((x) => x.id === c.carrier_id)?.name;
                      const prod = (products ?? []).find((x) => x.id === c.product_id)?.name;
                      const detail = [carrier, prod].filter(Boolean).join(" · ");
                      return {
                        value: c.id,
                        label: who || "Contrato",
                        description: detail || undefined,
                        hint: c.policy_number ? `Apólice ${c.policy_number}` : undefined,
                      };
                    })}
                    value={watch("contract_id") ?? ""}
                    onChange={(v) => setValue("contract_id", v || undefined)}
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
                    value={watch("quote_id") ?? ""}
                    onChange={(v) => setValue("quote_id", v || undefined)}
                    placeholder="Opcional"
                    searchPlaceholder="Buscar orçamento..."
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Combobox
              options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
              value={watch("assignee_id") ?? ""}
              onChange={(v) => setValue("assignee_id", v || undefined)}
              placeholder="Atribuir"
              searchPlaceholder="Buscar usuário..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Envolvidos</Label>
              <MultiSelect
                options={[
                  ...(groups ?? []).map((g) => ({
                    value: `group:${g.id}`,
                    label: `Grupo: ${g.name} (${g.member_ids.length})`,
                  })),
                  ...(users ?? []).map((u) => ({ value: u.id, label: u.name })),
                ]}
                values={watch("participant_ids") ?? []}
                onChange={(v) => setValue("participant_ids", expandGroups(v, groups ?? []))}
                placeholder="Nenhum"
                searchPlaceholder="Buscar usuário ou grupo..."
                triggerClassName="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <MultiSelect
                options={(tags ?? []).map((t) => ({ value: t.name, label: t.name }))}
                values={watch("tags") ?? []}
                onChange={(v) => setValue("tags", v)}
                placeholder="Nenhuma"
                searchPlaceholder="Buscar tag..."
                emptyText="Nenhuma tag. Crie em Configurações → Etiquetas."
                triggerClassName="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Salvar alterações" : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
