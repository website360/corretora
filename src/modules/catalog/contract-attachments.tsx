"use client";

import * as React from "react";
import { Download, FileText, ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { contractAttachmentsService } from "@/services/contract-attachments.service";
import { getContractFileUrl } from "@/services/storage.service";
import { useAsyncData } from "@/hooks/use-async-data";
import type { ContractAttachment } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ContractAttachments({ contractId }: { contractId: string }) {
  const { data, loading, refetch } = useAsyncData(
    () => contractAttachmentsService.list(contractId),
    [contractId],
  );
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await contractAttachmentsService.add(contractId, file);
      }
      toast.success(files.length > 1 ? "Anexos enviados" : "Anexo enviado");
      refetch();
    } catch (err) {
      toast.error((err as Error).message ?? "Falha ao enviar o anexo.");
    } finally {
      setUploading(false);
    }
  }

  async function open(att: ContractAttachment) {
    try {
      const url = await getContractFileUrl(att.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o arquivo.");
    }
  }

  async function remove(att: ContractAttachment) {
    setBusyId(att.id);
    try {
      await contractAttachmentsService.remove(att);
      toast.success("Anexo removido");
      refetch();
    } catch {
      toast.error("Não foi possível remover o anexo.");
    } finally {
      setBusyId(null);
    }
  }

  const items = data ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Paperclip className="size-4" /> Documentos
        </h3>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={handleFiles}
        />
        <Button variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="size-3.5" /> Anexar documento
        </Button>
      </div>

      {loading ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-muted-foreground">
          Nenhum documento. Anexe a proposta assinada, a apólice e outros (PDF ou imagem, até 10MB).
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((att) => {
            const isImage = att.mime_type.startsWith("image/");
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <li key={att.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <button
                  onClick={() => open(att)}
                  className="min-w-0 flex-1 text-left hover:underline"
                  title="Abrir"
                >
                  <p className="truncate text-sm font-medium">{att.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
                </button>
                <Button variant="ghost" size="icon-sm" title="Baixar" onClick={() => open(att)}>
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Remover"
                  loading={busyId === att.id}
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(att)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
