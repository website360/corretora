"use client";

import * as React from "react";
import { toast } from "sonner";
import { taskBoardsService } from "@/services/task-boards.service";
import { useDirectoryStore } from "@/stores/directory-store";
import { TONE_DOT_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { StageColor, TaskColumn } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export function TaskColumnDialog({
  open,
  onOpenChange,
  boardId,
  column,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  column?: TaskColumn | null;
  onSaved?: () => void;
}) {
  const editing = Boolean(column);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<StageColor>("primary");
  const [terminal, setTerminal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(column?.name ?? "");
      setColor(column?.color ?? "primary");
      setTerminal(column?.is_terminal ?? false);
    }
  }, [open, column]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await taskBoardsService.updateColumn(column!.id, { name, color, is_terminal: terminal });
        toast.success("Bloco atualizado");
      } else {
        await taskBoardsService.createColumn(boardId, name, color);
        toast.success("Bloco criado");
      }
      await useDirectoryStore.getState().refreshTaskBoards();
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
          <DialogDescription>Personalize as colunas deste kanban de tarefas.</DialogDescription>
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
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Bloco de conclusão</p>
              <p className="text-xs text-muted-foreground">
                Cartões aqui contam como concluídos (usado ao finalizar).
              </p>
            </div>
            <Switch checked={terminal} onCheckedChange={setTerminal} />
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
