"use client";

import * as React from "react";
import { toast } from "sonner";
import { Link2, Plus, X } from "lucide-react";
import { carriersService } from "@/services/carriers.service";
import { normalizeUrl } from "@/lib/utils";
import type { Carrier, CarrierLink } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Manages ONLY the links of a carrier (name/logo/status stay in the full edit). */
export function CarrierLinksDialog({
  open,
  onOpenChange,
  carrier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrier: Carrier | null;
  onSaved?: () => void;
}) {
  const [links, setLinks] = React.useState<CarrierLink[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setLinks(carrier?.links ?? []);
  }, [open, carrier]);

  function setLink(i: number, patch: Partial<CarrierLink>) {
    setLinks((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function save() {
    if (!carrier) return;
    setSaving(true);
    try {
      await carriersService.update(carrier.id, {
        links: links
          .filter((l) => l.url.trim())
          .map((l) => ({ label: l.label.trim(), url: normalizeUrl(l.url) })),
      });
      toast.success("Links atualizados");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar os links.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4" /> Links{carrier ? ` — ${carrier.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Portal do corretor, cotação, sinistro, 2ª via... Abrem em nova aba.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {links.length === 0 ? (
            <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
              Nenhum link ainda.
            </p>
          ) : (
            links.map((link, i) => (
              <div key={i} className="grid grid-cols-[150px_1fr_auto] items-center gap-2">
                <Input
                  placeholder="Nome (ex.: Cotação)"
                  value={link.label}
                  onChange={(e) => setLink(i, { label: e.target.value })}
                />
                <Input
                  placeholder="www.exemplo.com.br"
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
            ))
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLinks((arr) => [...arr, { label: "", url: "" }])}
          >
            <Plus className="size-3.5" /> Adicionar link
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            Salvar links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
