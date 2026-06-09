"use client";

import * as React from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileText,
  Flag,
  History,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Tag,
  Trash2,
  UserCircle,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ticketsService } from "@/services/tickets.service";
import { finalizeTask } from "@/services/finalize.service";
import { usersService } from "@/services/users.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useRealtime } from "@/hooks/use-realtime";
import { useDirectory, useDirectoryStore } from "@/stores/directory-store";
import { useSession } from "@/contexts/session-context";
import { findCustomer, findUser } from "@/services/lookup";
import { taskBoardsService } from "@/services/task-boards.service";
import {
  TICKET_SUBJECT_META,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META,
  TONE_BADGE_CLASS,
  TONE_DOT_CLASS,
} from "@/config/domain";
import { tagsService } from "@/services/tags.service";
import { formatShortDate, formatSmartDate, taskCode } from "@/utils/format";
import { cn, initials } from "@/lib/utils";
import type {
  TaskColumn,
  Ticket,
  TicketLog,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from "@/types/domain";
import { TicketFormDialog } from "@/modules/tickets/ticket-form-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/common/tag-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { TicketComposer } from "@/modules/tickets/ticket-composer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TicketConversation({ id }: { id: string }) {
  const { user, can } = useSession();
  const isAdmin = can(["admin", "super_admin"]);
  useDirectory();
  const { data: ticket, loading, refetch } = useAsyncData(() => ticketsService.get(id), [id]);
  const { data: users } = useAsyncData(() => usersService.list());
  const taskColumns = useDirectoryStore((s) => s.taskColumns);
  const [messages, setMessages] = React.useState<TicketMessage[]>([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"chat" | "activity">("chat");
  const [deleteMsg, setDeleteMsg] = React.useState<TicketMessage | null>(null);
  const [deletingMsg, setDeletingMsg] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { data: logs, refetch: refetchLogs } = useAsyncData(() => ticketsService.logs(id), [id]);

  React.useEffect(() => {
    ticketsService.messages(id).then(setMessages);
  }, [id]);

  async function confirmDeleteMessage() {
    const m = deleteMsg;
    if (!m) return;
    setDeletingMsg(true);
    try {
      await ticketsService.removeMessage(m.id, id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      refetchLogs();
      setDeleteMsg(null);
      toast.success("Mensagem excluída");
    } catch {
      toast.error("Não foi possível excluir a mensagem.");
    } finally {
      setDeletingMsg(false);
    }
  }

  // Live updates — appends new messages when Realtime is enabled.
  useRealtime<TicketMessage>({
    table: "ticket_messages",
    filter: `ticket_id=eq.${id}`,
    event: "INSERT",
    onChange: ({ new: msg }) => setMessages((prev) => [...prev, msg]),
  });

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(body: string, kind: "message" | "internal_note") {
    const msg = await ticketsService.sendMessage(id, body, kind);
    setMessages((prev) => [...prev, msg]);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return <EmptyState title="Tarefa não encontrada" className="h-full" />;
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader
          ticket={ticket}
          columns={taskColumns
            .filter((c) => c.board_id === ticket.board_id)
            .sort((a, b) => a.position - b.position)}
          onChange={refetch}
          onEdit={() => setEditOpen(true)}
        />
        {ticket.description && (
          <div className="border-b bg-card/40 px-4 py-3 lg:px-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Descrição
            </p>
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
              {ticket.description}
            </p>
          </div>
        )}
        {/* Conversa / Atividade */}
        <div className="flex items-center gap-1 border-b bg-card/40 px-4 py-2 lg:px-6">
          <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare} label="Conversa" />
            <TabButton active={tab === "activity"} onClick={() => setTab("activity")} icon={History} label="Atividade" />
          </div>
        </div>

        {tab === "chat" ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl space-y-5 p-4 lg:p-6">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    currentUserId={user.id}
                    canDelete={m.author_id === user.id || isAdmin}
                    onDelete={() => setDeleteMsg(m)}
                  />
                ))}
              </div>
            </div>
            <div className="border-t bg-muted/20 p-3 lg:p-4">
              <div className="mx-auto max-w-3xl">
                <TicketComposer onSend={handleSend} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl p-4 lg:p-6">
              <ActivityFeed logs={logs ?? []} messages={messages} />
            </div>
          </div>
        )}
      </div>

      {/* Details sidebar */}
      <TicketDetails ticket={ticket} users={users ?? []} onChange={refetch} />

      <TicketFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ticket={ticket}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={deleteMsg !== null}
        onOpenChange={(o) => !o && setDeleteMsg(null)}
        title="Excluir mensagem"
        description="A mensagem será removida permanentemente e o registro ficará no histórico da tarefa."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deletingMsg}
        onConfirm={confirmDeleteMessage}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}

type FeedItem =
  | { kind: "comment"; id: string; actorId: string | null; at: string; body: string; internal: boolean }
  | {
      kind: "event";
      id: string;
      actorId: string | null;
      at: string;
      event: TicketLog["event"];
      meta: Record<string, unknown>;
    };

function feedActorName(id: string | null): string {
  return (id && findUser(id)?.name) || "Sistema";
}

function feedDescribe(it: FeedItem): string {
  if (it.kind === "comment") return it.internal ? "adicionou uma nota interna" : "comentou";
  const statusLabel = (s: unknown) =>
    TICKET_STATUS_META[s as TicketStatus]?.label ?? String(s);
  switch (it.event) {
    case "created":
      return "criou a tarefa";
    case "status_changed": {
      const to = it.meta?.to ? statusLabel(it.meta.to) : null;
      const from = it.meta?.from ? statusLabel(it.meta.from) : null;
      if (from && to) return `mudou o status de ${from} para ${to}`;
      if (to) return `mudou o status para ${to}`;
      return "mudou o status";
    }
    case "priority_changed": {
      const to = it.meta?.to
        ? (TICKET_PRIORITY_META[it.meta.to as TicketPriority]?.label ?? String(it.meta.to))
        : null;
      return to ? `alterou a prioridade para ${to}` : "alterou a prioridade";
    }
    case "assigned": {
      const to = it.meta?.to ? feedActorName(String(it.meta.to)) : null;
      return to ? `atribuiu para ${to}` : "removeu o responsável";
    }
    case "participant_added": {
      const who = it.meta?.to ? feedActorName(String(it.meta.to)) : null;
      return who ? `adicionou ${who} aos envolvidos` : "adicionou um envolvido";
    }
    case "participant_removed": {
      const who = it.meta?.to ? feedActorName(String(it.meta.to)) : null;
      return who ? `removeu ${who} dos envolvidos` : "removeu um envolvido";
    }
    case "tag_added":
      return it.meta?.tag ? `adicionou a etiqueta "${String(it.meta.tag)}"` : "adicionou uma etiqueta";
    case "tag_removed":
      return it.meta?.tag ? `removeu a etiqueta "${String(it.meta.tag)}"` : "removeu uma etiqueta";
    case "due_changed":
      return "alterou o prazo";
    case "due_removed":
      return "removeu o prazo";
    case "edited":
      return "editou a tarefa";
    case "comment_deleted":
      return "removeu um comentário";
    default:
      return "atualizou a tarefa";
  }
}

function FeedIcon({ item }: { item: FeedItem }) {
  const cls = "size-3.5 text-muted-foreground";
  if (item.kind === "comment") return <MessageSquare className={cls} />;
  switch (item.event) {
    case "created":
      return <Plus className={cls} />;
    case "status_changed":
      return <CircleDot className={cls} />;
    case "priority_changed":
      return <Flag className={cls} />;
    case "assigned":
      return <UserRound className={cls} />;
    case "participant_added":
    case "participant_removed":
      return <Users className={cls} />;
    case "tag_added":
    case "tag_removed":
      return <Tag className={cls} />;
    case "due_changed":
    case "due_removed":
      return <CalendarClock className={cls} />;
    case "edited":
      return <Pencil className={cls} />;
    case "comment_deleted":
      return <Trash2 className={cls} />;
    default:
      return <History className={cls} />;
  }
}

/** Full activity log of a task: comments (messages) + change events, newest first. */
function ActivityFeed({ logs, messages }: { logs: TicketLog[]; messages: TicketMessage[] }) {
  const items = React.useMemo<FeedItem[]>(() => {
    const fromMsgs: FeedItem[] = messages.map((m) => ({
      kind: "comment",
      id: m.id,
      actorId: m.author_id,
      at: m.created_at,
      body: m.body,
      internal: m.kind === "internal_note",
    }));
    const fromLogs: FeedItem[] = logs
      .filter((l) => l.event !== "comment") // comments already come from messages
      .map((l) => ({
        kind: "event",
        id: l.id,
        actorId: l.actor_id,
        at: l.created_at,
        event: l.event,
        meta: l.meta ?? {},
      }));
    return [...fromMsgs, ...fromLogs].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [logs, messages]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Sem atividade ainda"
        description="Comentários e alterações desta tarefa aparecerão aqui."
      />
    );
  }

  return (
    <ol className="relative ml-3 space-y-4 border-l border-border/70 pl-6">
      {items.map((it) => (
        <li key={`${it.kind}-${it.id}`} className="relative">
          <span className="absolute -left-[37px] flex size-6 items-center justify-center rounded-full border bg-card">
            <FeedIcon item={it} />
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium">{feedActorName(it.actorId)}</span>
            <span className="text-sm text-muted-foreground">{feedDescribe(it)}</span>
            <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
              {formatSmartDate(it.at)}
            </span>
          </div>
          {it.kind === "comment" && (
            <p
              className={cn(
                "mt-1.5 whitespace-pre-wrap rounded-lg border bg-muted/30 px-3 py-2 text-sm",
                it.internal && "border-warning/30 bg-warning/10",
              )}
            >
              {it.internal && (
                <span className="mr-1 text-xs font-semibold text-warning">[Nota interna]</span>
              )}
              {it.body}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function ConversationHeader({
  ticket,
  columns,
  onChange,
  onEdit,
}: {
  ticket: Ticket;
  columns: TaskColumn[];
  onChange: () => void;
  onEdit: () => void;
}) {
  const [confirmFinalize, setConfirmFinalize] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);
  const currentStage = columns.find((c) => c.id === ticket.column_id);

  async function setStage(columnId: string) {
    if (ticket.board_id) await taskBoardsService.moveCard("task", ticket.id, ticket.board_id, columnId);
    onChange();
  }
  async function setPriority(priority: TicketPriority) {
    await ticketsService.setPriority(ticket.id, priority);
    onChange();
  }
  async function finalize() {
    setFinalizing(true);
    try {
      await finalizeTask(ticket);
      toast.success("Tarefa finalizada");
      setConfirmFinalize(false);
      onChange();
    } catch {
      toast.error("Não foi possível finalizar");
    } finally {
      setFinalizing(false);
    }
  }
  return (
    <div className="space-y-3 border-b bg-card/40 px-4 py-3 lg:px-6">
      {/* Top row: back + primary actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/tickets">
            <ArrowLeft /> Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {!currentStage?.is_terminal && (
            <Button
              variant="outline"
              size="sm"
              className="text-success hover:text-success"
              onClick={() => setConfirmFinalize(true)}
            >
              <CheckCircle2 /> Finalizar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil /> Editar
          </Button>
        </div>
      </div>

      {/* Title + status controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{taskCode(ticket.number)}</span>
            <Badge variant="outline" className="text-[10px]">
              {TICKET_SUBJECT_META[ticket.subject_type].label}
            </Badge>
          </div>
          <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight">{ticket.title}</h1>
        </div>

        <div className="flex items-end gap-2">
          <label className="space-y-1">
            <span className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Prioridade
            </span>
            <Select value={ticket.priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger className="h-9 w-[140px]">
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
          </label>
          <label className="space-y-1">
            <span className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Etapa
            </span>
            <Select value={ticket.column_id ?? ""} onValueChange={setStage}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", TONE_DOT_CLASS[c.color])} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>

      <ConfirmDialog
        open={confirmFinalize}
        onOpenChange={setConfirmFinalize}
        title="Finalizar tarefa"
        description={'A tarefa será movida para a etapa "Fechado".'}
        confirmLabel="Finalizar"
        loading={finalizing}
        onConfirm={finalize}
      />
    </div>
  );
}

function MessageBubble({
  message,
  currentUserId,
  canDelete,
  onDelete,
}: {
  message: TicketMessage;
  currentUserId: string;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const author = findUser(message.author_id);
  const isMine = message.author_id === currentUserId;

  return (
    <div className={cn("group flex gap-3", isMine && "flex-row-reverse")}>
      <Avatar className="size-8 shrink-0">
        {author?.avatar_url && <AvatarImage src={author.avatar_url} alt={author.name} />}
        <AvatarFallback>{initials(author?.name)}</AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0 max-w-[80%] space-y-1", isMine && "items-end text-right")}>
        <div className={cn("flex items-center gap-2 text-xs", isMine && "flex-row-reverse")}>
          <span className="font-medium text-foreground">{author?.name ?? "Usuário"}</span>
          <span className="text-muted-foreground">{formatSmartDate(message.created_at)}</span>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Excluir mensagem"
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
        <div
          className={cn(
            "inline-block rounded-2xl px-3.5 py-2.5 text-sm",
            isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap break-words text-left">{message.body}</p>
          {message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg bg-background/40 px-2 py-1.5 text-xs"
                >
                  <Paperclip className="size-3.5" />
                  <span className="truncate">{a.name}</span>
                  <span className="ml-auto opacity-70">{Math.round(a.size / 1024)} KB</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDetails({
  ticket,
  users,
  onChange,
}: {
  ticket: Ticket;
  users: { id: string; name: string; avatar_url: string | null }[];
  onChange: () => void;
}) {
  const customer = findCustomer(ticket.customer_id);
  const assignee = findUser(ticket.assignee_id);
  const { data: tags } = useAsyncData(() => tagsService.list("tasks"));
  const tagColor = (name: string) =>
    (tags ?? []).find((t) => t.name === name)?.color ?? "neutral";
  const involved = (ticket.participant_ids ?? []).map((id) => findUser(id)).filter(Boolean);
  const creator = findUser(ticket.created_by);

  async function assign(userId: string) {
    await ticketsService.assign(ticket.id, userId);
    onChange();
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l bg-card xl:flex">
      <ScrollArea className="flex-1">
        <div className="space-y-5 p-5">
          <DetailSection icon={UserCircle} title="Responsável">
            <Select value={ticket.assignee_id ?? ""} onValueChange={assign}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Atribuir" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailSection>

          <Separator />

          <DetailSection icon={Users} title="Envolvidos">
            {involved.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {involved.map((u) => (
                  <div key={u!.id} className="flex items-center gap-1.5">
                    <UserAvatar name={u!.name} src={u!.avatar_url} className="size-6" />
                    <span className="text-xs">{u!.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Ninguém</span>
            )}
            {creator && (
              <p className="mt-2 text-xs text-muted-foreground">Criado por {creator.name}</p>
            )}
          </DetailSection>

          <Separator />

          <DetailSection icon={FileText} title="Cliente">
            {customer ? (
              <Link
                href={`/clientes/${customer.id}`}
                className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent/50"
              >
                <UserAvatar name={customer.name} className="size-8" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Ver perfil</p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Tarefa interna (sem cliente)</p>
            )}
          </DetailSection>

          <Separator />

          <DetailSection icon={Tag} title="Etiquetas">
            <div className="flex flex-wrap gap-1.5">
              {ticket.tags.length > 0 ? (
                ticket.tags.map((t) => (
                  <TagBadge key={t} name={t} color={tagColor(t)} />
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Sem tags</span>
              )}
            </div>
          </DetailSection>

          <Separator />

          <DetailSection icon={CalendarClock} title="Datas">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Criado</dt>
                <dd>{formatShortDate(ticket.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Atualizado</dt>
                <dd>{formatShortDate(ticket.updated_at)}</dd>
              </div>
              {ticket.due_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Prazo</dt>
                  <dd className="font-medium text-warning">{formatShortDate(ticket.due_at)}</dd>
                </div>
              )}
            </dl>
          </DetailSection>

          {assignee && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">SLA:</span> recurso preparado para
                ativação futura, com base na prioridade <strong>{TICKET_PRIORITY_META[ticket.priority].label}</strong>.
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}
