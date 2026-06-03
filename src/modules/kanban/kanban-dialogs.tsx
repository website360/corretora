"use client";

import * as React from "react";
import { toast } from "sonner";
import { kanbanService } from "@/services/kanban.service";
import { TONE_DOT_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { KanbanBoard, KanbanColumn, StageColor } from "@/types/domain";
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

const COLORS: { value: StageColor; label: string }[] = [
  { value: "neutral", label: "Cinza" },
  { value: "primary", label: "Azul" },
  { value: "success", label: "Verde" },
  { value: "warning", label: "Amarelo" },
  { value: "destructive", label: "Vermelho" },
];

export function BoardDialog({
  open,
  onOpenChange,
  board,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board?: KanbanBoard | null;
  onSaved?: (boardId?: string) => void;
}) {
  const editing = Boolean(board);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(board?.name ?? "");
      setDescription(board?.description ?? "");
    }
  }, [open, board]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await kanbanService.updateBoard(board!.id, { name, description: description || null });
        toast.success("Kanban atualizado");
        onSaved?.(board!.id);
      } else {
        const created = await kanbanService.createBoard(name, description || null);
        toast.success("Kanban criado");
        onSaved?.(created.id);
      }
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
          <DialogDescription>
            Crie um funil para organizar seus leads em blocos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-name">Nome</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Funil de vendas"
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
          {!editing && (
            <p className="text-xs text-muted-foreground">
              Blocos padrão (Novo, Em contato, Ganho, Perdido) serão criados — você pode
              personalizá-los depois.
            </p>
          )}
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

export function ColumnDialog({
  open,
  onOpenChange,
  boardId,
  column,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  column?: KanbanColumn | null;
  onSaved?: () => void;
}) {
  const editing = Boolean(column);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<StageColor>("primary");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(column?.name ?? "");
      setColor(column?.color ?? "primary");
    }
  }, [open, column]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await kanbanService.updateColumn(column!.id, { name, color });
        toast.success("Bloco atualizado");
      } else {
        await kanbanService.createColumn(boardId, name, color);
        toast.success("Bloco criado");
      }
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o bloco");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar bloco" : "Novo bloco"}</DialogTitle>
          <DialogDescription>Os leads ficam organizados em blocos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="col-name">Nome</Label>
            <Input
              id="col-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Em negociação"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border-2 transition-colors",
                    color === c.value ? "border-foreground" : "border-transparent hover:border-border",
                  )}
                >
                  <span className={cn("size-4 rounded-full", TONE_DOT_CLASS[c.value])} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>
            {editing ? "Salvar" : "Criar bloco"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
