"use client";

import * as React from "react";
import { toast } from "sonner";
import { taskBoardsService } from "@/services/task-boards.service";
import { useDirectoryStore } from "@/stores/directory-store";
import type { TaskColumn } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColorPicker, IconPicker } from "@/components/common/style-pickers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [color, setColor] = React.useState<string>("primary");
  const [icon, setIcon] = React.useState<string | null>(null);
  const [terminal, setTerminal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(column?.name ?? "");
      setColor(column?.color ?? "primary");
      setIcon(column?.icon ?? null);
      setTerminal(column?.is_terminal ?? false);
    }
  }, [open, column]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await taskBoardsService.updateColumn(column!.id, {
          name,
          color,
          icon,
          is_terminal: terminal,
        });
        toast.success("Bloco atualizado");
      } else {
        await taskBoardsService.createColumn(boardId, name, color, icon);
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
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="space-y-2">
            <Label>Ícone (substitui a bolinha)</Label>
            <IconPicker value={icon} onChange={setIcon} color={color} />
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
