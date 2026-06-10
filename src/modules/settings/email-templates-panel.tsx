"use client";

import * as React from "react";
import { Mail, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { emailTemplatesService } from "@/services/email-templates.service";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_EVENT_META,
  defaultTemplate,
  type EmailEvent,
  type MessageChannel,
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
  channel: MessageChannel;
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

  const rowFor = (event: string, channel: MessageChannel) =>
    (rows ?? []).find((r) => !r.is_custom && r.event === event && r.channel === channel) ?? null;
  const customs = (rows ?? []).filter((r) => r.is_custom);

  function effective(event: EmailEvent, channel: MessageChannel) {
    const def = defaultTemplate(event);
    const row = rowFor(event, channel);
    const base =
      channel === "email"
        ? { subject: def.email.subject, body: def.email.html }
        : { subject: "", body: def.whatsapp.text };
    return {
      id: row?.id ?? null,
      name: row?.name ?? def.name,
      subject: row?.subject ?? base.subject,
      body: row?.body ?? base.body,
      enabled: row?.enabled ?? true,
      auto_send: row?.auto_send ?? false,
      vars: def.vars,
    };
  }

  function openSystem(event: EmailEvent, channel: MessageChannel) {
    const e = effective(event, channel);
    setEditor({ event, channel, isCustom: false, ...e });
  }

  function openCustom(row?: EmailTemplateRow) {
    setEditor({
      event: "custom",
      channel: "email",
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

  async function toggleFlag(
    event: EmailEvent,
    channel: MessageChannel,
    field: "enabled" | "auto_send",
    value: boolean,
  ) {
    const e = effective(event, channel);
    try {
      await emailTemplatesService.saveSystem(event, channel, e.id, {
        name: e.name,
        subject: e.subject,
        body: e.body,
        enabled: field === "enabled" ? value : e.enabled,
        auto_send: field === "auto_send" ? value : e.auto_send,
      });
      refetch();
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }

  async function save() {
    if (!editor) return;
    const needsSubject = editor.channel === "email";
    if (!editor.body.trim() || (needsSubject && !editor.subject.trim())) return;
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
        await emailTemplatesService.saveSystem(editor.event, editor.channel, editor.id, {
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

  const channelRow = (event: EmailEvent, channel: MessageChannel) => {
    const e = effective(event, channel);
    const Icon = channel === "email" ? Mail : MessageCircle;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {channel === "email" ? "E-mail" : "WhatsApp"}
          {e.auto_send && e.enabled && <Badge variant="secondary">Por padrão</Badge>}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={e.enabled} onCheckedChange={(v) => toggleFlag(event, channel, "enabled", v)} />
            Ativo
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={e.auto_send}
              disabled={!e.enabled}
              onCheckedChange={(v) => toggleFlag(event, channel, "auto_send", v)}
            />
            Enviar por padrão
          </label>
          <Button variant="outline" size="sm" onClick={() => openSystem(event, channel)}>
            <Pencil /> Editar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-medium">Mensagens ao cliente</p>
        <p className="text-sm text-muted-foreground">
          Por ação, escolha enviar <strong>e-mail</strong> e/ou <strong>WhatsApp</strong> e edite o
          template de cada canal. &quot;Enviar por padrão&quot; deixa o toggle da ação pré-marcado.
          E-mail sai pelo SMTP da corretora; WhatsApp pelo provedor conectado (Integrações).
        </p>
      </div>

      <div className="space-y-3">
        {DEFAULT_EMAIL_TEMPLATES.map((def) => {
          const meta = EMAIL_EVENT_META[def.event];
          return (
            <Card key={def.event}>
              <CardContent className="space-y-2 p-4">
                <div>
                  <p className="font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                {channelRow(def.event, "email")}
                {channelRow(def.event, "whatsapp")}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Templates personalizados (e-mail)</CardTitle>
            <CardDescription>
              Modelos para enviar manualmente ao cliente quando quiser.
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

      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editor?.isCustom
                ? "Template personalizado"
                : `Editar ${editor?.channel === "email" ? "e-mail" : "WhatsApp"}`}
            </DialogTitle>
            <DialogDescription>
              Use variáveis como <code>{"{{cliente.primeiro_nome}}"}</code> — clique para inserir.
              {editor?.channel === "email" && " O corpo é HTML."}
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="space-y-3">
              {(editor.isCustom || editor.channel === "email") && (
                <>
                  {editor.isCustom && (
                    <div className="space-y-1.5">
                      <Label>Nome do template</Label>
                      <Input
                        value={editor.name}
                        onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Assunto</Label>
                    <Input
                      value={editor.subject}
                      onChange={(e) => setEditor({ ...editor, subject: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>{editor.channel === "email" ? "Corpo (HTML)" : "Mensagem"}</Label>
                <Textarea
                  value={editor.body}
                  onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                  rows={editor.channel === "email" ? 10 : 6}
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
