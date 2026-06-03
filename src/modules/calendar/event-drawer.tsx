"use client";

import * as React from "react";
import { CheckCircle2, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { calendarService } from "@/services/calendar.service";
import { finalizeEvent } from "@/services/finalize.service";
import { findUser } from "@/services/lookup";
import { EVENT_MODALITY_META } from "@/config/domain";
import { eventCode, formatSmartDate, formatTime } from "@/utils/format";
import type { CalendarEvent } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { NewEventDialog } from "@/modules/calendar/new-event-dialog";

export function EventDrawer({
  event,
  open,
  onOpenChange,
  onChanged,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const [shown, setShown] = React.useState<CalendarEvent | null>(event);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmFinalize, setConfirmFinalize] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);

  React.useEffect(() => {
    if (event) setShown(event);
  }, [event]);

  async function finalize() {
    if (!shown) return;
    setFinalizing(true);
    try {
      await finalizeEvent(shown);
      toast.success("Evento finalizado");
      setConfirmFinalize(false);
      onOpenChange(false);
      onChanged?.();
    } catch {
      toast.error("Não foi possível finalizar");
    } finally {
      setFinalizing(false);
    }
  }

  async function refreshShown() {
    if (!shown) return;
    const list = await calendarService.list();
    const fresh = list.find((e) => e.id === shown.id);
    if (fresh) setShown(fresh);
  }

  async function remove() {
    if (!shown) return;
    setDeleting(true);
    try {
      await calendarService.remove(shown.id);
      toast.success("Evento movido para a lixeira");
      setConfirmDelete(false);
      onOpenChange(false);
      onChanged?.();
    } catch {
      toast.error("Não foi possível excluir o evento");
    } finally {
      setDeleting(false);
    }
  }

  const owner = findUser(shown?.owner_id);
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
                  {shown.number != null && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {eventCode(shown.number)}
                    </span>
                  )}
                  <Badge variant="secondary">
                    {EVENT_MODALITY_META[shown.modality ?? "not_applicable"].label}
                  </Badge>
                  {shown.finished && <Badge variant="success">Finalizado</Badge>}
                  {(shown.tags ?? []).map((t) => (
                    <Badge key={t} variant="outline" className="capitalize">
                      {t}
                    </Badge>
                  ))}
                </div>
                <SheetTitle>{shown.title}</SheetTitle>
                <SheetDescription>Detalhes do evento</SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <Row label="Quando">
                  <span className="text-sm">
                    {formatSmartDate(shown.starts_at)} – {formatTime(shown.ends_at)}
                  </span>
                </Row>

                {shown.location && (
                  <Row label="Local">
                    <span className="flex items-center gap-1 text-sm">
                      <MapPin className="size-3.5 text-muted-foreground" /> {shown.location}
                    </span>
                  </Row>
                )}

                <Separator />

                <Row label="Responsável">
                  {owner ? (
                    <span className="flex items-center gap-2">
                      <UserAvatar name={owner.name} src={owner.avatar_url} className="size-6" />
                      <span className="text-sm">{owner.name}</span>
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

                {creator && (
                  <>
                    <Separator />
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3" /> Criado por {creator.name}
                    </p>
                  </>
                )}
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
                {!shown.finished && (
                  <Button variant="outline" onClick={() => setConfirmFinalize(true)}>
                    <CheckCircle2 /> Finalizar
                  </Button>
                )}
                <Button className="flex-1" onClick={() => setEditOpen(true)}>
                  <Pencil /> Editar
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmFinalize}
        onOpenChange={setConfirmFinalize}
        title="Finalizar evento"
        description="O evento será marcado como finalizado."
        confirmLabel="Finalizar"
        loading={finalizing}
        onConfirm={finalize}
      />

      <NewEventDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        defaultDate={new Date()}
        event={shown}
        onSaved={() => {
          refreshShown();
          onChanged?.();
        }}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir evento</DialogTitle>
            <DialogDescription>
              O evento <strong>{shown?.title}</strong> será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} loading={deleting}>
              Excluir evento
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
