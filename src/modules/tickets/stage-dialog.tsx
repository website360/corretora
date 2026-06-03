"use client";

import * as React from "react";
import { toast } from "sonner";
import { stagesService } from "@/services/stages.service";
import { TONE_DOT_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { StageColor, TaskStage } from "@/types/domain";
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

const STAGE_COLORS: { value: StageColor; label: string }[] = [
  { value: "neutral", label: "Cinza" },
  { value: "primary", label: "Azul" },
  { value: "success", label: "Verde" },
  { value: "warning", label: "Amarelo" },
  { value: "destructive", label: "Vermelho" },
];

export function StageDialog({
  open,
  onOpenChange,
  stage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage?: TaskStage | null;
}) {
  const editing = Boolean(stage);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<StageColor>("primary");
  const [terminal, setTerminal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(stage?.name ?? "");
      setColor(stage?.color ?? "primary");
      setTerminal(stage?.is_terminal ?? false);
    }
  }, [open, stage]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await stagesService.update(stage!.id, { name, color, is_terminal: terminal });
        toast.success("Etapa atualizada");
      } else {
        await stagesService.create(name, color);
        toast.success("Etapa criada");
      }
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar a etapa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar etapa" : "Nova etapa"}</DialogTitle>
          <DialogDescription>
            Personalize o funil de tarefas da sua corretora.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nome</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Em negociação"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {STAGE_COLORS.map((c) => (
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
          {editing && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Etapa final (concluída)</p>
                <p className="text-xs text-muted-foreground">
                  Tarefas aqui contam como resolvidas nas métricas.
                </p>
              </div>
              <Switch checked={terminal} onCheckedChange={setTerminal} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>
            {editing ? "Salvar" : "Criar etapa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
