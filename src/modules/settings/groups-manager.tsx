"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { userGroupsService } from "@/services/user-groups.service";
import { usersService } from "@/services/users.service";
import { useAsyncData } from "@/hooks/use-async-data";
import type { UserGroup } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect } from "@/components/ui/multi-select";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GroupsManager() {
  const { data: groups, loading, refetch } = useAsyncData(() => userGroupsService.list());
  const { data: users } = useAsyncData(() => usersService.list());

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserGroup | null>(null);
  const [deleting, setDeleting] = React.useState<UserGroup | null>(null);

  const [name, setName] = React.useState("");
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const userName = React.useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u.name])),
    [users],
  );
  const userOptions = (users ?? []).map((u) => ({ value: u.id, label: u.name }));

  function openNew() {
    setEditing(null);
    setName("");
    setMemberIds([]);
    setDialogOpen(true);
  }
  function openEdit(group: UserGroup) {
    setEditing(group);
    setName(group.name);
    setMemberIds(group.member_ids ?? []);
    setDialogOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Informe o nome do grupo.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await userGroupsService.update(editing.id, { name: name.trim(), member_ids: memberIds });
        toast.success("Grupo atualizado");
      } else {
        await userGroupsService.create({ name: name.trim(), member_ids: memberIds });
        toast.success("Grupo criado");
      }
      setDialogOpen(false);
      refetch();
    } catch {
      toast.error("Não foi possível salvar o grupo.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await userGroupsService.remove(deleting.id);
      toast.success("Grupo excluído");
      setDeleting(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir o grupo.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Grupos de usuários</CardTitle>
          <CardDescription>
            Crie grupos para referenciar vários usuários de uma vez nas tarefas e eventos.
          </CardDescription>
        </div>
        <Button onClick={openNew}>
          <Plus /> Novo grupo
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (groups ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum grupo"
            description="Crie um grupo (ex.: Comercial, Sinistro) para agilizar a atribuição."
          />
        ) : (
          <div className="space-y-2">
            {(groups ?? []).map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.member_ids.length === 0
                      ? "Sem membros"
                      : g.member_ids
                          .map((id) => userName.get(id))
                          .filter(Boolean)
                          .join(", ")}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {g.member_ids.length} membro(s)
                </Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(g)} title="Editar">
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(g)}
                  title="Excluir"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar grupo" : "Novo grupo"}</DialogTitle>
            <DialogDescription>Dê um nome e escolha os membros.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group_name">Nome do grupo</Label>
              <Input
                id="group_name"
                placeholder="Ex.: Comercial"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Membros</Label>
              <MultiSelect
                options={userOptions}
                values={memberIds}
                onChange={setMemberIds}
                placeholder="Nenhum"
                searchPlaceholder="Buscar usuário..."
                triggerClassName="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Salvar alterações" : "Criar grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir grupo"
        description={
          <>
            O grupo <strong>{deleting?.name}</strong> será removido. As tarefas já criadas não
            são afetadas.
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
