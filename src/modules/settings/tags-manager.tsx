"use client";

import * as React from "react";
import { Lock, Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { tagsService } from "@/services/tags.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { TAG_MODULE_META, TONE_DOT_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { StageColor, Tag, TagModule } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect } from "@/components/ui/multi-select";
import { EmptyState } from "@/components/common/empty-state";
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

const MODULE_OPTIONS = (Object.keys(TAG_MODULE_META) as TagModule[]).map((k) => ({
  value: k,
  label: TAG_MODULE_META[k].label,
}));

export function TagsManager() {
  const { data, loading, refetch } = useAsyncData(() => tagsService.list());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Tag | null>(null);
  const [deleting, setDeleting] = React.useState<Tag | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(tag: Tag) {
    setEditing(tag);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    await tagsService.remove(deleting.id);
    toast.success("Tag excluída");
    setDeleting(null);
    refetch();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Etiquetas (Tags)</CardTitle>
          <CardDescription>
            Crie tags e escolha em quais módulos elas ficam disponíveis.
          </CardDescription>
        </div>
        <Button onClick={openNew}>
          <Plus /> Nova tag
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={TagIcon}
            title="Nenhuma tag"
            description="Crie a primeira tag para organizar tarefas, eventos e clientes."
          />
        ) : (
          <ul className="divide-y divide-border">
            {(data ?? []).map((tag) => (
              <li key={tag.id} className="flex items-center gap-3 py-3">
                <span className={cn("size-3 shrink-0 rounded-full", TONE_DOT_CLASS[tag.color])} />
                <span className="font-medium">{tag.name}</span>
                <div className="ml-2 flex flex-wrap gap-1">
                  {tag.modules.length === 0 ? (
                    <Badge variant="secondary">Todos os módulos</Badge>
                  ) : (
                    tag.modules.map((m) => (
                      <Badge key={m} variant="outline">
                        {TAG_MODULE_META[m].label}
                      </Badge>
                    ))
                  )}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {tag.is_system ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-muted-foreground"
                      title="Etiqueta padrão do sistema. Para uma diferente, crie a sua."
                    >
                      <Lock className="size-3" /> Padrão
                    </Badge>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(tag)}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(tag)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <TagDialog open={dialogOpen} onOpenChange={setDialogOpen} tag={editing} onSaved={refetch} />

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tag</DialogTitle>
            <DialogDescription>
              A tag <strong>{deleting?.name}</strong> será removida do catálogo. Registros que já a
              utilizam mantêm o texto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TagDialog({
  open,
  onOpenChange,
  tag,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: Tag | null;
  onSaved: () => void;
}) {
  const editing = Boolean(tag);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<StageColor>("primary");
  const [modules, setModules] = React.useState<TagModule[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(tag?.name ?? "");
      setColor(tag?.color ?? "primary");
      setModules(tag?.modules ?? []);
    }
  }, [open, tag]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await tagsService.update(tag!.id, { name, color, modules });
        toast.success("Tag atualizada");
      } else {
        await tagsService.create({ name, color, modules });
        toast.success("Tag criada");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao salvar a tag");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tag" : "Nova tag"}</DialogTitle>
          <DialogDescription>Defina o nome, a cor e o escopo da tag.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Nome</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: urgente"
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
                  title={c.label}
                  onClick={() => setColor(c.value)}
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
          <div className="space-y-2">
            <Label>Disponível em</Label>
            <MultiSelect
              options={MODULE_OPTIONS}
              values={modules}
              onChange={(v) => setModules(v as TagModule[])}
              placeholder="Todos os módulos"
              searchPlaceholder="Buscar módulo..."
              triggerClassName="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para a tag valer em todos os módulos.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>
            {editing ? "Salvar" : "Criar tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
