"use client";

import * as React from "react";
import { Building2, Package, Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { defaultCatalogService } from "@/services/default-catalog.service";
import { uploadAvatar } from "@/services/storage.service";
import { cropToSquare } from "@/lib/image";
import { useAsyncData } from "@/hooks/use-async-data";
import { CarrierLogo } from "@/components/common/carrier-logo";
import type { DefaultCarrier, DefaultProduct } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DefaultTagsPanel } from "@/modules/admin/default-tags-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DefaultCatalogPanel() {
  const [syncing, setSyncing] = React.useState(false);

  async function syncAll() {
    setSyncing(true);
    try {
      await defaultCatalogService.syncToAllCompanies();
      toast.success("Catálogo padrão aplicado a todas as empresas.");
    } catch {
      toast.error("Não foi possível aplicar a todas as empresas.");
    } finally {
      setSyncing(false);
    }
  }

  const catalogSyncBar = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Catálogo padrão do sistema. Toda empresa nova já nasce com estes itens. Ao adicionar um
        item novo, ele é aplicado também às empresas já existentes (sem duplicar); use o botão ao
        lado para reaplicar quando quiser.
      </p>
      <Button variant="outline" onClick={syncAll} loading={syncing}>
        <RefreshCw /> Aplicar a todas as empresas
      </Button>
    </div>
  );

  return (
    <Tabs defaultValue="carriers" className="space-y-4">
      <TabsList>
        <TabsTrigger value="carriers">Seguradoras</TabsTrigger>
        <TabsTrigger value="products">Produtos</TabsTrigger>
        <TabsTrigger value="tags">Etiquetas</TabsTrigger>
      </TabsList>
      <TabsContent value="carriers" className="space-y-4">
        {catalogSyncBar}
        <CarriersCard />
      </TabsContent>
      <TabsContent value="products" className="space-y-4">
        {catalogSyncBar}
        <ProductsCard />
      </TabsContent>
      <TabsContent value="tags">
        <DefaultTagsPanel />
      </TabsContent>
    </Tabs>
  );
}

function CarriersCard() {
  const { data, loading, refetch } = useAsyncData(() => defaultCatalogService.listCarriers());
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<DefaultCarrier | null>(null);
  const [deleting, setDeleting] = React.useState<DefaultCarrier | null>(null);
  const [name, setName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

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

  function openNew() {
    setEditing(null);
    setName("");
    setWebsite("");
    setLogoUrl("");
    setDialog(true);
  }
  function openEdit(c: DefaultCarrier) {
    setEditing(c);
    setName(c.name);
    setWebsite(c.website ?? "");
    setLogoUrl(c.logo_url ?? "");
    setDialog(true);
  }
  async function save() {
    if (!name.trim()) {
      toast.error("Informe o nome da seguradora.");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), website: website || null, logo_url: logoUrl || null };
      if (editing) {
        await defaultCatalogService.updateCarrier(editing.id, payload);
        toast.success("Seguradora padrão atualizada");
      } else {
        await defaultCatalogService.createCarrier(payload);
        await defaultCatalogService.syncToAllCompanies();
        toast.success("Seguradora adicionada ao padrão e a todas as empresas");
      }
      setDialog(false);
      refetch();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }
  async function confirmDelete() {
    if (!deleting) return;
    try {
      await defaultCatalogService.removeCarrier(deleting.id);
      toast.success("Removida");
      setDeleting(null);
      refetch();
    } catch {
      toast.error("Não foi possível remover.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Seguradoras padrão</CardTitle>
          <CardDescription>Seguradoras pré-cadastradas em toda empresa nova.</CardDescription>
        </div>
        <Button onClick={openNew}>
          <Plus /> Nova seguradora
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={Building2} title="Nenhuma seguradora padrão" description="Adicione as seguradoras do catálogo padrão." />
        ) : (
          <div className="space-y-2">
            {(data ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <CarrierLogo src={c.logo_url} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  {c.website && (
                    <p className="truncate text-xs text-muted-foreground">{c.website}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)} title="Editar">
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(c)}
                  title="Remover"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar seguradora padrão" : "Nova seguradora padrão"}</DialogTitle>
            <DialogDescription>Nome e (opcional) site/logo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dc_name">Nome</Label>
              <Input id="dc_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Porto Seguro" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc_site">Site</Label>
              <Input id="dc_site" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                <CarrierLogo src={logoUrl || null} className="size-14" />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  loading={uploading}
                >
                  <Upload className="size-3.5" /> Enviar imagem
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setLogoUrl("")}
                  >
                    <X className="size-3.5" /> Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remover seguradora padrão"
        description={
          <>
            <strong>{deleting?.name}</strong> deixará de ser incluída em novas empresas. As
            empresas existentes não são afetadas.
          </>
        }
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}

function ProductsCard() {
  const { data, loading, refetch } = useAsyncData(() => defaultCatalogService.listProducts());
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<DefaultProduct | null>(null);
  const [deleting, setDeleting] = React.useState<DefaultProduct | null>(null);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setName("");
    setCategory("");
    setDialog(true);
  }
  function openEdit(p: DefaultProduct) {
    setEditing(p);
    setName(p.name);
    setCategory(p.category === "outros" ? "" : p.category);
    setDialog(true);
  }
  async function save() {
    if (!name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), category: category.trim() || "outros" };
      if (editing) {
        await defaultCatalogService.updateProduct(editing.id, payload);
        toast.success("Produto padrão atualizado");
      } else {
        await defaultCatalogService.createProduct(payload);
        await defaultCatalogService.syncToAllCompanies();
        toast.success("Produto adicionado ao padrão e a todas as empresas");
      }
      setDialog(false);
      refetch();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }
  async function confirmDelete() {
    if (!deleting) return;
    try {
      await defaultCatalogService.removeProduct(deleting.id);
      toast.success("Removido");
      setDeleting(null);
      refetch();
    } catch {
      toast.error("Não foi possível remover.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Produtos padrão</CardTitle>
          <CardDescription>Produtos/ramos pré-cadastrados em toda empresa nova.</CardDescription>
        </div>
        <Button onClick={openNew}>
          <Plus /> Novo produto
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={Package} title="Nenhum produto padrão" description="Adicione os produtos do catálogo padrão." />
        ) : (
          <div className="space-y-2">
            {(data ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                </div>
                {p.category && p.category !== "outros" && (
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {p.category}
                  </Badge>
                )}
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)} title="Editar">
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(p)}
                  title="Remover"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto padrão" : "Novo produto padrão"}</DialogTitle>
            <DialogDescription>Nome e (opcional) ramo/categoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dp_name">Nome</Label>
              <Input id="dp_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Seguro Auto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dp_cat">Ramo / categoria</Label>
              <Input id="dp_cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="auto, vida, residencial..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remover produto padrão"
        description={
          <>
            <strong>{deleting?.name}</strong> deixará de ser incluído em novas empresas. As
            empresas existentes não são afetadas.
          </>
        }
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
