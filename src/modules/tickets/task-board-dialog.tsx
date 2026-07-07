"use client";

import * as React from "react";
import { toast } from "sonner";
import { taskBoardsService } from "@/services/task-boards.service";
import { useDirectoryStore } from "@/stores/directory-store";
import { TASK_BOARD_KINDS, TASK_BOARD_KIND_META } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { TaskBoard, TaskBoardKind } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TaskBoardDialog({
  open,
  onOpenChange,
  board,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board?: TaskBoard | null;
  onSaved?: (boardId?: string) => void;
}) {
  const editing = Boolean(board);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [kind, setKind] = React.useState<TaskBoardKind>("tasks");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(board?.name ?? "");
      setDescription(board?.description ?? "");
      setKind(board?.kind ?? "tasks");
    }
  }, [open, board]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let id = board?.id;
      if (editing) {
        await taskBoardsService.updateBoard(board!.id, {
          name,
          description: description || null,
          kind,
        });
        toast.success("Kanban atualizado");
      } else {
        const created = await taskBoardsService.createBoard(name, description || null, kind);
        id = created.id;
        toast.success("Kanban criado");
      }
      await useDirectoryStore.getState().refreshTaskBoards();
      onSaved?.(id);
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o kanban");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar kanban" : "Novo kanban"}</DialogTitle>
          <DialogDescription>Quadros de tarefas da sua corretora.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo do Kanban</Label>
            <div className="grid grid-cols-3 gap-2">
              {TASK_BOARD_KINDS.map((k) => {
                const meta = TASK_BOARD_KIND_META[k];
                const Icon = meta.icon;
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/5 text-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-name">Nome</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Sinistros"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-desc">Descrição</Label>
            <Textarea
              id="board-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>
            {editing ? "Salvar" : "Criar kanban"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
