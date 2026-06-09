"use client";

import * as React from "react";
import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { emailTemplatesService } from "@/services/email-templates.service";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_EVENT_META,
  defaultTemplate,
  type EmailEvent,
} from "@/config/email-templates";
import type { EmailTemplateRow } from "@/types/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

interface EditorState {
  event: string;
  isCustom: boolean;
  id: string | null;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  auto_send: boolean;
  vars: string[];
}

export function EmailTemplatesPanel() {
  const { data: rows, loading, refetch } = useAsyncData(() => emailTemplatesService.list());
  const [editor, setEditor] = React.useState<EditorState | null>(null);
  const [deleting, setDeleting] = React.useState<EmailTemplateRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  const rowFor = (event: string) =>
    (rows ?? []).find((r) => !r.is_custom && r.event === event) ?? null;
  const customs = (rows ?? []).filter((r) => r.is_custom);

  function openSystem(event: EmailEvent) {
    const def = defaultTemplate(event);
    const row = rowFor(event);
    setEditor({
      event,
      isCustom: false,
      id: row?.id ?? null,
      name: row?.name ?? def.name,
      subject: row?.subject ?? def.subject,
      body: row?.body ?? def.body,
      enabled: row?.enabled ?? true,
      auto_send: row?.auto_send ?? false,
      vars: def.vars,
    });
  }

  function openCustom(row?: EmailTemplateRow) {
    setEditor({
      event: "custom",
      isCustom: true,
      id: row?.id ?? null,
      name: row?.name ?? "",
      subject: row?.subject ?? "",
      body: row?.body ?? "",
      enabled: row?.enabled ?? true,
      auto_send: false,
      vars: defaultTemplate("contract_created").vars,
    });
  }

  /** Liga/desliga um flag direto no card (sem abrir o editor). */
  async function toggleFlag(event: EmailEvent, field: "enabled" | "auto_send", value: boolean) {
    const def = defaultTemplate(event);
    const row = rowFor(event);
    try {
      await emailTemplatesService.saveSystem(event, row?.id ?? null, {
        name: row?.name ?? def.name,
        subject: row?.subject ?? def.subject,
        body: row?.body ?? def.body,
        enabled: field === "enabled" ? value : (row?.enabled ?? true),
        auto_send: field === "auto_send" ? value : (row?.auto_send ?? false),
      });
      refetch();
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  async function save() {
    if (!editor) return;
    if (!editor.name.trim() || !editor.subject.trim() || !editor.body.trim()) return;
    setSaving(true);
    try {
      if (editor.isCustom) {
        if (editor.id) {
          await emailTemplatesService.update(editor.id, {
            name: editor.name,
            subject: editor.subject,
            body: editor.body,
          });
        } else {
          await emailTemplatesService.createCustom({
            name: editor.name,
            subject: editor.subject,
            body: editor.body,
          });
        }
      } else {
        await emailTemplatesService.saveSystem(editor.event, editor.id, {
          name: editor.name,
          subject: editor.subject,
          body: editor.body,
          enabled: editor.enabled,
          auto_send: editor.auto_send,
        });
      }
      toast.success("Template salvo");
      setEditor(null);
      refetch();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await emailTemplatesService.remove(deleting.id);
    toast.success("Template excluído");
    setDeleting(null);
    refetch();
  }

  function insertVar(v: string) {
    setEditor((e) => (e ? { ...e, body: `${e.body}{{${v}}}` } : e));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-medium">E-mails ao cliente</p>
        <p className="text-sm text-muted-foreground">
          Templates por evento. Edite o texto, ative e defina se envia por padrão — na ação, o
          usuário confirma com um toggle. Saem pelo SMTP da corretora (Integrações).
        </p>
      </div>

      {/* Eventos do sistema */}
      <div className="space-y-3">
        {DEFAULT_EMAIL_TEMPLATES.map((def) => {
          const event = def.event;
          const row = rowFor(event);
          const enabled = row?.enabled ?? true;
          const auto = row?.auto_send ?? false;
          const meta = EMAIL_EVENT_META[event];
          return (
            <Card key={event} className={enabled ? "" : "opacity-70"}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <Mail className="size-4 text-muted-foreground" /> {row?.name ?? def.name}
                    {auto && <Badge variant="secondary">Envia por padrão</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleFlag(event, "enabled", v)}
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={auto}
                    disabled={!enabled}
                    onCheckedChange={(v) => toggleFlag(event, "auto_send", v)}
                  />
                  Enviar por padrão
                </label>
                <Button variant="outline" size="sm" onClick={() => openSystem(event)}>
                  <Pencil /> Editar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Templates personalizados */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Templates personalizados</CardTitle>
            <CardDescription>
              Crie modelos para enviar manualmente ao cliente quando quiser.
            </CardDescription>
          </div>
          <Button onClick={() => openCustom()}>
            <Plus /> Novo template
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : customs.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Nenhum template personalizado"
              description="Crie modelos reutilizáveis para o seu dia a dia."
            />
          ) : (
            <ul className="divide-y divide-border">
              {customs.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.subject}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => openCustom(c)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(c)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editor?.isCustom ? "Template personalizado" : "Editar template"}</DialogTitle>
            <DialogDescription>
              Use variáveis como <code>{"{{cliente.primeiro_nome}}"}</code> — clique nas etiquetas
              para inserir.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome do template</Label>
                <Input
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input
                  value={editor.subject}
                  onChange={(e) => setEditor({ ...editor, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mensagem</Label>
                <Textarea
                  value={editor.body}
                  onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                  rows={9}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {editor.vars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="rounded border bg-muted px-1.5 py-0.5 text-[11px] hover:bg-accent"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              {!editor.isCustom && (
                <div className="flex flex-wrap gap-6 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={editor.enabled}
                      onCheckedChange={(v) => setEditor({ ...editor, enabled: v })}
                    />
                    Ativo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={editor.auto_send}
                      disabled={!editor.enabled}
                      onCheckedChange={(v) => setEditor({ ...editor, auto_send: v })}
                    />
                    Enviar por padrão neste evento
                  </label>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir template"
        description={`O template "${deleting?.name ?? ""}" será removido.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
