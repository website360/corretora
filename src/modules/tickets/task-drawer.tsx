"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ticketsService } from "@/services/tickets.service";
import { finalizeTask } from "@/services/finalize.service";
import { findCustomer, findTaskColumn, findUser } from "@/services/lookup";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TICKET_SUBJECT_META, TICKET_PRIORITY_META, TONE_BADGE_CLASS, TONE_DOT_CLASS } from "@/config/domain";
import { formatShortDate, formatSmartDate, taskCode } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export function TaskDrawer({
  ticket,
  open,
  onOpenChange,
  onChanged,
}: {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  // Keep the last shown ticket so the close animation still has content.
  const [shown, setShown] = React.useState<Ticket | null>(ticket);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmFinalize, setConfirmFinalize] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);

  React.useEffect(() => {
    if (ticket) setShown(ticket);
  }, [ticket]);

  async function finalize() {
    if (!shown) return;
    setFinalizing(true);
    try {
      await finalizeTask(shown);
      toast.success("Tarefa finalizada");
      setConfirmFinalize(false);
      onOpenChange(false);
      onChanged?.();
    } catch {
      toast.error("Não foi possível finalizar");
    } finally {
      setFinalizing(false);
    }
  }

  async function remove() {
    if (!shown) return;
    setDeleting(true);
    try {
      await ticketsService.remove(shown.id);
      toast.success("Tarefa excluída");
      setConfirmDelete(false);
      onOpenChange(false);
      onChanged?.();
    } catch {
      toast.error("Não foi possível excluir a tarefa");
    } finally {
      setDeleting(false);
    }
  }

  const stage = findTaskColumn(shown?.column_id);
  const customer = findCustomer(shown?.customer_id);
  const assignee = findUser(shown?.assignee_id);
  const creator = findUser(shown?.created_by);
  const involved = (shown?.participant_ids ?? []).map((id) => findUser(id)).filter(Boolean);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          {shown && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-1.5 pr-8">
                  <span className="font-mono text-xs text-muted-foreground">
                    {taskCode(shown.number)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {TICKET_SUBJECT_META[shown.subject_type].label}
                  </Badge>
                  {stage && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                        TONE_BADGE_CLASS[stage.color],
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", TONE_DOT_CLASS[stage.color])} />
                      {stage.name}
                    </span>
                  )}
                </div>
                <SheetTitle>{shown.title}</SheetTitle>
                <SheetDescription>Resumo da tarefa</SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <Row label="Prioridade">
                  <StatusBadge meta={TICKET_PRIORITY_META[shown.priority]} />
                </Row>

                <Row label="Prazo">
                  <span className="text-sm">
                    {shown.due_at ? formatShortDate(shown.due_at) : "Sem prazo"}
                  </span>
                </Row>

                <Separator />

                <Row label="Cliente">
                  {customer ? (
                    <Link
                      href={`/clientes/${customer.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {customer.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">Tarefa interna</span>
                  )}
                </Row>

                <Row label="Responsável">
                  {assignee ? (
                    <span className="flex items-center gap-2">
                      <UserAvatar name={assignee.name} src={assignee.avatar_url} className="size-6" />
                      <span className="text-sm">{assignee.name}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </Row>

                <Row label="Envolvidos">
                  {involved.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {involved.map((u) => (
                        <span key={u!.id} className="flex items-center gap-1.5">
                          <UserAvatar name={u!.name} src={u!.avatar_url} className="size-6" />
                          <span className="text-sm">{u!.name}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Ninguém</span>
                  )}
                </Row>

                <Row label="Etiquetas">
                  {shown.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {shown.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="capitalize">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem tags</span>
                  )}
                </Row>

                {shown.description && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Descrição
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {shown.description}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-1 text-xs text-muted-foreground">
                  {creator && <p>Criado por {creator.name}</p>}
                  <p>Atualizada {formatSmartDate(shown.updated_at)}</p>
                </div>
              </div>

              <SheetFooter>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  title="Excluir"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                </Button>
                {!stage?.is_terminal && (
                  <Button variant="outline" onClick={() => setConfirmFinalize(true)}>
                    <CheckCircle2 /> Finalizar
                  </Button>
                )}
                <Button className="flex-1" asChild>
                  <Link href={`/tickets/${shown.id}`}>
                    <ExternalLink /> Abrir
                  </Link>
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmFinalize}
        onOpenChange={setConfirmFinalize}
        title="Finalizar tarefa"
        description={'A tarefa será movida para a etapa "Fechado".'}
        confirmLabel="Finalizar"
        loading={finalizing}
        onConfirm={finalize}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              A tarefa <strong>{taskCode(shown?.number)}</strong> e sua conversa serão removidas
              permanentemente. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} loading={deleting}>
              Excluir tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
