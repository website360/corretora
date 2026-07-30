"use client";

import * as React from "react";
import { GripVertical, ListChecks, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { checklistsService } from "@/services/checklists.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { findUser } from "@/services/lookup";
import { formatSmartDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { TaskChecklistItem, TaskChecklistWithItems } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Painel de checklists de uma tarefa. Uma tarefa pode ter vários checklists
 * nomeados (ex.: "Documentos", "Vistoria"), cada um com itens marcáveis,
 * renomeáveis e reordenáveis por arrastar.
 */
export function TaskChecklistPanel({
  ticketId,
  onChanged,
}: {
  ticketId: string;
  /** Chamado após qualquer alteração — usado para atualizar o log da tarefa. */
  onChanged?: () => void;
}) {
  const { data, loading, refetch } = useAsyncData(
    () => checklistsService.list(ticketId),
    [ticketId],
  );
  const [lists, setLists] = React.useState<TaskChecklistWithItems[]>([]);
  const [adding, setAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<TaskChecklistWithItems | null>(null);
  const [removing, setRemoving] = React.useState(false);

  React.useEffect(() => setLists(data ?? []), [data]);

  /** Aplica a mudança na tela na hora e desfaz se o servidor recusar. */
  async function optimistic(next: TaskChecklistWithItems[], action: () => Promise<unknown>) {
    const prev = lists;
    setLists(next);
    try {
      await action();
      onChanged?.();
    } catch {
      setLists(prev);
      toast.error("Não foi possível salvar a alteração.");
    }
  }

  async function createChecklist() {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const created = await checklistsService.createChecklist(ticketId, title);
      setLists((prev) => [...prev, { ...created, items: [] }]);
      setNewTitle("");
      setAdding(false);
      onChanged?.();
    } catch {
      toast.error("Não foi possível criar o checklist.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemoveChecklist() {
    const target = deleting;
    if (!target) return;
    setRemoving(true);
    try {
      await checklistsService.removeChecklist(target.id, ticketId, target.title);
      setLists((prev) => prev.filter((l) => l.id !== target.id));
      setDeleting(null);
      toast.success("Checklist excluído");
      onChanged?.();
    } catch {
      toast.error("Não foi possível excluir o checklist.");
    } finally {
      setRemoving(false);
    }
  }

  const renameChecklist = (id: string, title: string) =>
    optimistic(
      lists.map((l) => (l.id === id ? { ...l, title } : l)),
      () => checklistsService.renameChecklist(id, title),
    );

  const addItem = async (checklistId: string, content: string) => {
    try {
      const item = await checklistsService.addItem(checklistId, ticketId, content);
      setLists((prev) =>
        prev.map((l) => (l.id === checklistId ? { ...l, items: [...l.items, item] } : l)),
      );
      onChanged?.();
    } catch {
      toast.error("Não foi possível adicionar o item.");
    }
  };

  const patchItem = (itemId: string, patch: Partial<TaskChecklistItem>) =>
    lists.map((l) => ({
      ...l,
      items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    }));

  const toggleItem = (item: TaskChecklistItem, done: boolean) =>
    optimistic(
      patchItem(item.id, {
        done,
        done_at: done ? new Date().toISOString() : null,
        done_by: done ? item.done_by : null,
      }),
      () => checklistsService.toggleItem(item, done),
    );

  const renameItem = (itemId: string, content: string) =>
    optimistic(patchItem(itemId, { content }), () =>
      checklistsService.renameItem(itemId, content),
    );

  const removeItem = (itemId: string) =>
    optimistic(
      lists.map((l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) })),
      () => checklistsService.removeItem(itemId),
    );

  const reorderItems = (checklistId: string, ordered: TaskChecklistItem[]) =>
    optimistic(
      lists.map((l) => (l.id === checklistId ? { ...l, items: ordered } : l)),
      () => checklistsService.reorderItems(ordered.map((i) => i.id)),
    );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  const addForm = (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") createChecklist();
          if (e.key === "Escape") {
            setAdding(false);
            setNewTitle("");
          }
        }}
        placeholder="Nome do checklist (ex.: Documentos)"
        className="max-w-xs"
      />
      <Button size="sm" onClick={createChecklist} loading={saving}>
        Criar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setAdding(false);
          setNewTitle("");
        }}
      >
        Cancelar
      </Button>
    </div>
  );

  if (lists.length === 0) {
    return (
      <>
        {adding ? (
          <div className="py-6">{addForm}</div>
        ) : (
          <EmptyState
            icon={ListChecks}
            title="Nenhum checklist ainda"
            description="Organize as etapas desta tarefa em listas de itens marcáveis — os documentos a recolher, a vistoria, o que falta para fechar."
            action={
              <Button onClick={() => setAdding(true)}>
                <Plus /> Novo checklist
              </Button>
            }
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      {lists.map((list) => (
        <ChecklistCard
          key={list.id}
          list={list}
          onRename={(title) => renameChecklist(list.id, title)}
          onDelete={() => setDeleting(list)}
          onAddItem={(content) => addItem(list.id, content)}
          onToggleItem={toggleItem}
          onRenameItem={renameItem}
          onRemoveItem={removeItem}
          onReorder={(ordered) => reorderItems(list.id, ordered)}
        />
      ))}

      {adding ? (
        addForm
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus /> Novo checklist
        </Button>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir checklist"
        description={
          <>
            O checklist <strong>{deleting?.title}</strong> e seus {deleting?.items.length ?? 0}{" "}
            item(ns) serão removidos permanentemente.
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={removing}
        onConfirm={confirmRemoveChecklist}
      />
    </div>
  );
}

function ChecklistCard({
  list,
  onRename,
  onDelete,
  onAddItem,
  onToggleItem,
  onRenameItem,
  onRemoveItem,
  onReorder,
}: {
  list: TaskChecklistWithItems;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddItem: (content: string) => void;
  onToggleItem: (item: TaskChecklistItem, done: boolean) => void;
  onRenameItem: (itemId: string, content: string) => void;
  onRemoveItem: (itemId: string) => void;
  onReorder: (ordered: TaskChecklistItem[]) => void;
}) {
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [title, setTitle] = React.useState(list.title);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [dragId, setDragId] = React.useState<string | null>(null);

  React.useEffect(() => setTitle(list.title), [list.title]);

  const done = list.items.filter((i) => i.done).length;
  const pct = list.items.length ? (done / list.items.length) * 100 : 0;

  function commitTitle() {
    const next = title.trim();
    setEditingTitle(false);
    if (next && next !== list.title) onRename(next);
    else setTitle(list.title);
  }

  function submitItem() {
    const content = draft.trim();
    if (!content) return;
    onAddItem(content);
    setDraft("");
  }

  /** Solta o item arrastado na posição de `targetId`. */
  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = list.items.findIndex((i) => i.id === dragId);
    const to = list.items.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const ordered = [...list.items];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved!);
    onReorder(ordered);
  }

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <ListChecks className="size-4 shrink-0 text-muted-foreground" />
        {editingTitle ? (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitle(list.title);
                setEditingTitle(false);
              }
            }}
            className="h-8 max-w-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="truncate rounded px-1 text-sm font-semibold hover:bg-accent/50"
            title="Renomear"
          >
            {list.title}
          </button>
        )}
        <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
          {done}/{list.items.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingTitle(true)}>
              <Pencil /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 /> Excluir checklist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="px-4 pt-3">
        <Progress value={pct} className="h-1.5" />
      </div>

      <ul className="space-y-0.5 p-2">
        {list.items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            dragging={dragId === item.id}
            onDragStart={() => setDragId(item.id)}
            onDragEnd={() => setDragId(null)}
            onDrop={() => dropOn(item.id)}
            onToggle={(done) => onToggleItem(item, done)}
            onRename={(content) => onRenameItem(item.id, content)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </ul>

      <div className="px-2 pb-3">
        {adding ? (
          <div className="flex items-center gap-2 px-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitItem();
                if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              placeholder="Descreva o item e tecle Enter"
              className="h-8"
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              title="Fechar"
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus /> Adicionar item
          </Button>
        )}
      </div>
    </section>
  );
}

function ChecklistRow({
  item,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onToggle,
  onRename,
  onRemove,
}: {
  item: TaskChecklistItem;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onToggle: (done: boolean) => void;
  onRename: (content: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(item.content);
  const doneBy = findUser(item.done_by);

  React.useEffect(() => setText(item.content), [item.content]);

  function commit() {
    const next = text.trim();
    setEditing(false);
    if (next && next !== item.content) onRename(next);
    else setText(item.content);
  }

  return (
    <li
      draggable={!editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/40",
        dragging && "opacity-50",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
      <Checkbox
        checked={item.done}
        onCheckedChange={(v) => onToggle(v === true)}
        aria-label={item.content}
      />
      {editing ? (
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setText(item.content);
              setEditing(false);
            }
          }}
          className="h-7"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "min-w-0 flex-1 truncate text-left text-sm",
            item.done && "text-muted-foreground line-through",
          )}
          title="Editar item"
        >
          {item.content}
        </button>
      )}
      {item.done && item.done_at && !editing && (
        <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
          {doneBy ? `${doneBy.name} · ` : ""}
          {formatSmartDate(item.done_at)}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        title="Remover item"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
