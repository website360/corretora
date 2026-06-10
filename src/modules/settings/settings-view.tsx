"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Blocks,
  Building2,
  Monitor,
  Moon,
  Package,
  Palette,
  Mail,
  Plug,
  SlidersHorizontal,
  Sun,
  Tag as TagIcon,
  UserCircle,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { usersService } from "@/services/users.service";
import { companiesService } from "@/services/companies.service";
import { uploadAvatar } from "@/services/storage.service";
import { TagsManager } from "@/modules/settings/tags-manager";
import { GroupsManager } from "@/modules/settings/groups-manager";
import { PreferencesPanel } from "@/modules/settings/preferences-panel";
import { IntegrationsPanel } from "@/modules/settings/integrations-panel";
import { EmailTemplatesPanel } from "@/modules/settings/email-templates-panel";
import { BrandingPanel } from "@/modules/settings/branding-panel";
import { ProductsView } from "@/modules/catalog/products-view";
import { plansService } from "@/services/plans.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { PLATFORM_MODULES } from "@/config/modules";
import { ROLE_LABELS } from "@/types/domain";
import { maskCNPJ, maskPhone } from "@/lib/masks";
import { formatCNPJ, formatPhone } from "@/utils/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/user-avatar";

export function SettingsView() {
  const { user, can } = useSession();
  const router = useRouter();
  const initialTab = useSearchParams().get("tab") ?? "profile";
  const { theme, setTheme } = useTheme();
  const [modules, setModules] = React.useState(PLATFORM_MODULES);

  // Profile form
  const [profile, setProfile] = React.useState({
    name: user.name,
    phone: user.phone ? formatPhone(user.phone) : "",
    job_title: user.job_title ?? "",
  });
  const [savingProfile, setSavingProfile] = React.useState(false);

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatar_url);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, user.id);
      await usersService.update(user.id, { avatar_url: url });
      setAvatarUrl(url);
      toast.success("Foto atualizada");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Company form
  const [company, setCompany] = React.useState({
    legal_name: user.company.legal_name,
    trade_name: user.company.trade_name,
    cnpj: formatCNPJ(user.company.cnpj),
    email: user.company.email,
    phone: user.company.phone ? formatPhone(user.company.phone) : "",
  });
  const [savingCompany, setSavingCompany] = React.useState(false);
  const canEditCompany = can(["admin", "super_admin"]);

  // White-label is unlocked by the company's plan (or always for the SaaS owner).
  const { data: plans } = useAsyncData(() => plansService.list());
  const myPlan = plans?.find((p) => p.id === user.company.plan_id);
  const hasWhiteLabel =
    can(["super_admin"]) || Boolean(myPlan?.modules?.includes("whitelabel"));
  const showBranding = canEditCompany && hasWhiteLabel;

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await usersService.update(user.id, {
        name: profile.name,
        phone: profile.phone || null,
        job_title: profile.job_title || null,
      });
      toast.success("Perfil atualizado");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar o perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveCompany() {
    setSavingCompany(true);
    try {
      await companiesService.update(user.company.id, {
        legal_name: company.legal_name,
        trade_name: company.trade_name,
        cnpj: company.cnpj,
        email: company.email,
        phone: company.phone,
      });
      toast.success("Empresa atualizada");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar a empresa");
    } finally {
      setSavingCompany(false);
    }
  }

  function toggleModule(key: string) {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m)));
    toast.success("Preferência de módulo atualizada");
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title="Configurações" description="Gerencie seu perfil, empresa e módulos." />

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <UserCircle className="size-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="size-4" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="tags">
            <TagIcon className="size-4" /> Etiquetas
          </TabsTrigger>
          <TabsTrigger value="groups">
            <UsersRound className="size-4" /> Grupos
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="size-4" /> Produtos
          </TabsTrigger>
          {canEditCompany && (
            <TabsTrigger value="preferences">
              <SlidersHorizontal className="size-4" /> Personalização
            </TabsTrigger>
          )}
          {canEditCompany && (
            <TabsTrigger value="integrations">
              <Plug className="size-4" /> Integrações
            </TabsTrigger>
          )}
          {canEditCompany && (
            <TabsTrigger value="emails">
              <Mail className="size-4" /> Mensagens
            </TabsTrigger>
          )}
          {showBranding && (
            <TabsTrigger value="branding">
              <Palette className="size-4" /> White-label
            </TabsTrigger>
          )}
          <TabsTrigger value="modules">
            <Blocks className="size-4" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Sun className="size-4" /> Aparência
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Seu perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <UserAvatar name={user.name} src={avatarUrl} className="size-16" />
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatar}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    loading={uploadingAvatar}
                    onClick={() => fileRef.current?.click()}
                  >
                    Alterar foto
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP, até 2MB.</p>
                </div>
                <Badge variant="default" className="ml-auto">
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={user.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="(11) 99999-9999"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={profile.job_title}
                    onChange={(e) => setProfile((p) => ({ ...p, job_title: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile} loading={savingProfile}>
                  Salvar alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Dados da empresa</CardTitle>
              <CardDescription>
                {canEditCompany
                  ? "Informações da sua corretora."
                  : "Somente administradores podem editar os dados da empresa."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Razão social</Label>
                  <Input
                    disabled={!canEditCompany}
                    value={company.legal_name}
                    onChange={(e) => setCompany((c) => ({ ...c, legal_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome fantasia</Label>
                  <Input
                    disabled={!canEditCompany}
                    value={company.trade_name}
                    onChange={(e) => setCompany((c) => ({ ...c, trade_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    disabled={!canEditCompany}
                    inputMode="numeric"
                    value={company.cnpj}
                    onChange={(e) => setCompany((c) => ({ ...c, cnpj: formatCNPJ(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    disabled={!canEditCompany}
                    value={company.email}
                    onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    disabled={!canEditCompany}
                    inputMode="numeric"
                    value={company.phone}
                    onChange={(e) => setCompany((c) => ({ ...c, phone: formatPhone(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plano atual</Label>
                  <div className="flex h-9 items-center">
                    <Badge variant="warning" className="capitalize">
                      {user.company.plan}
                    </Badge>
                  </div>
                </div>
              </div>
              {canEditCompany && (
                <div className="flex justify-end">
                  <Button onClick={saveCompany} loading={savingCompany}>
                    Salvar alterações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags */}
        <TabsContent value="tags">
          <TagsManager />
        </TabsContent>

        {/* Grupos */}
        <TabsContent value="groups">
          <GroupsManager />
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="products">
          <Card>
            <CardContent className="pt-6">
              <ProductsView embedded />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalização (admin) */}
        {canEditCompany && (
          <TabsContent value="preferences">
            <PreferencesPanel />
          </TabsContent>
        )}

        {/* Integrações (admin) */}
        {canEditCompany && (
          <TabsContent value="integrations">
            <IntegrationsPanel />
          </TabsContent>
        )}

        {canEditCompany && (
          <TabsContent value="emails">
            <EmailTemplatesPanel />
          </TabsContent>
        )}

        {/* White-label (admin + plano com módulo) */}
        {showBranding && (
          <TabsContent value="branding">
            <BrandingPanel />
          </TabsContent>
        )}

        {/* Modules */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Módulos da plataforma</CardTitle>
              <CardDescription>
                Ative ou desative módulos. Planos superiores liberam recursos avançados.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {modules.map((m) => (
                <div key={m.key} className="flex items-center gap-4 py-3.5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Blocks className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.name}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {m.min_plan}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  </div>
                  <Switch checked={m.enabled} onCheckedChange={() => toggleModule(m.key)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize o tema da interface.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "light", label: "Claro", icon: Sun },
                  { value: "dark", label: "Escuro", icon: Moon },
                  { value: "system", label: "Sistema", icon: Monitor },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors",
                        active
                          ? "border-primary bg-accent/50 text-primary"
                          : "hover:border-primary/30 hover:bg-accent/30",
                      )}
                    >
                      <Icon className="size-6" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
