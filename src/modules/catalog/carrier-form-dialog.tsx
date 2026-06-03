"use client";

import * as React from "react";
import { toast } from "sonner";
import { Link2, Plus, Upload, X } from "lucide-react";
import { carriersService } from "@/services/carriers.service";
import { uploadAvatar } from "@/services/storage.service";
import { normalizeUrl } from "@/lib/utils";
import { CarrierLogo } from "@/components/common/carrier-logo";
import type { Carrier, CarrierLink } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Normalizes any image to a centered 256×256 square (consistent icon). */
async function cropToSquare(file: File, size = 256): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    // Scale to COVER the square, centered (true crop).
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/png", 0.92),
    );
    return new File([blob], "logo.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CarrierFormDialog({
  open,
  onOpenChange,
  carrier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrier?: Carrier | null;
  onSaved?: () => void;
}) {
  const editing = Boolean(carrier);
  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "inactive">("active");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [links, setLinks] = React.useState<CarrierLink[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(carrier?.name ?? "");
    setStatus(carrier?.status ?? "active");
    setLogoUrl(carrier?.logo_url ?? null);
    setLinks(carrier?.links ?? []);
  }, [open, carrier]);

  function setLink(i: number, patch: Partial<CarrierLink>) {
    setLinks((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    setUploading(true);
    try {
      const square = await cropToSquare(file);
      const url = await uploadAvatar(square, "carriers");
      setLogoUrl(url);
    } catch (err) {
      toast.error((err as Error).message ?? "Falha no upload da imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Informe o nome da seguradora.");
      return;
    }
    setSaving(true);
    const payload = {
      name,
      status,
      logo_url: logoUrl,
      links: links
        .filter((l) => l.url.trim())
        .map((l) => ({ label: l.label.trim(), url: normalizeUrl(l.url) })),
      // campos não usados mantidos nulos
      cnpj: null,
      email: null,
      phone: null,
      website: null,
      notes: null,
    };
    try {
      if (editing) await carriersService.update(carrier!.id, payload);
      else await carriersService.create(payload);
      toast.success(editing ? "Seguradora atualizada" : "Seguradora criada");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar a seguradora.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar seguradora" : "Nova seguradora"}</DialogTitle>
          <DialogDescription>Seguradora parceira da sua corretora.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ícone (upload + crop quadrado) */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex items-center gap-3">
              <CarrierLogo src={logoUrl} className="size-16" />
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFile}
              />
              <div className="space-y-1">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-3.5" /> Enviar imagem
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setLogoUrl(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG até 2MB. A imagem é recortada em quadrado.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Links úteis (portal do corretor, cotação, sinistro, 2ª via...) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Link2 className="size-3.5" /> Links
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLinks((arr) => [...arr, { label: "", url: "" }])}
              >
                <Plus className="size-3.5" /> Adicionar link
              </Button>
            </div>
            {links.length === 0 ? (
              <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground">
                Nenhum link. Ex.: Portal do corretor, Cotação, Sinistro, 2ª via.
              </p>
            ) : (
              <div className="space-y-2">
                {links.map((link, i) => (
                  <div key={i} className="grid grid-cols-[150px_1fr_auto] items-center gap-2">
                    <Input
                      placeholder="Nome (ex.: Cotação)"
                      value={link.label}
                      onChange={(e) => setLink(i, { label: e.target.value })}
                    />
                    <Input
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => setLink(i, { url: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setLinks((arr) => arr.filter((_, idx) => idx !== i))}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!name.trim()}>
            {editing ? "Salvar alterações" : "Criar seguradora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
