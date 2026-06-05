"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Camera, Loader2, ShieldCheck, UserCircle } from "lucide-react";
import { useSession } from "@/contexts/session-context";
import { usersService } from "@/services/users.service";
import { companiesService } from "@/services/companies.service";
import { uploadAvatar } from "@/services/storage.service";
import { formatCNPJ, formatPhone } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/user-avatar";

/**
 * One-page mandatory cadastro shown right after the plan is chosen. Collects
 * the user's profile and the company data, then marks the company as onboarded
 * so the PlanGate stops redirecting here.
 */
export function OnboardingForm() {
  const router = useRouter();
  const { user } = useSession();

  const [profile, setProfile] = React.useState({
    name: user.name ?? "",
    phone: user.phone ? formatPhone(user.phone) : "",
    job_title: user.job_title ?? "",
  });
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatar_url);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Na criação da empresa (signup), o CNPJ recebe um placeholder
  // "pendente-xxxxxxxx". Só pré-preenche se já houver um CNPJ real (14 díg.).
  const realCnpj = (user.company.cnpj ?? "").replace(/\D/g, "").length === 14;
  const [company, setCompany] = React.useState({
    legal_name: user.company.legal_name ?? "",
    trade_name: user.company.trade_name ?? "",
    cnpj: realCnpj ? formatCNPJ(user.company.cnpj) : "",
    email: user.company.email ?? "",
    phone: user.company.phone ? formatPhone(user.company.phone) : "",
  });
  const [saving, setSaving] = React.useState(false);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, user.id);
      await usersService.update(user.id, { avatar_url: url });
      setAvatarUrl(url);
      toast.success("Foto atualizada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function missing() {
    if (!profile.name.trim()) return "Informe seu nome.";
    if (!company.trade_name.trim()) return "Informe o nome fantasia da corretora.";
    if (!company.legal_name.trim()) return "Informe a razão social.";
    if (company.cnpj.replace(/\D/g, "").length !== 14) return "Informe um CNPJ válido.";
    if (!company.email.trim()) return "Informe o e-mail da empresa.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = missing();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await usersService.update(user.id, {
        name: profile.name.trim(),
        phone: profile.phone || null,
        job_title: profile.job_title || null,
      });
      await companiesService.update(user.company.id, {
        legal_name: company.legal_name.trim(),
        trade_name: company.trade_name.trim(),
        cnpj: company.cnpj,
        email: company.email.trim(),
        phone: company.phone,
        onboarding_completed: true,
      });
      toast.success("Cadastro finalizado! Bem-vindo(a).");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Não foi possível finalizar o cadastro. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 lg:p-10">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Finalize seu cadastro</h1>
        <p className="text-muted-foreground">
          Falta pouco! Preencha seus dados e os da corretora para começar a usar o sistema.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Perfil */}
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <UserCircle className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Seu perfil</h2>
          </div>

          <div className="flex items-center gap-4">
            <UserAvatar name={profile.name || user.name} src={avatarUrl} className="size-16" />
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatar}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Enviar foto
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">Opcional · JPG ou PNG</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome *</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Cargo</Label>
              <Input
                id="job_title"
                placeholder="Ex.: Diretor"
                value={profile.job_title}
                onChange={(e) => setProfile((p) => ({ ...p, job_title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_phone">Telefone</Label>
              <Input
                id="user_phone"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user.email} disabled />
            </div>
          </div>
        </section>

        {/* Empresa */}
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Dados da corretora</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome fantasia *</Label>
              <Input
                id="trade_name"
                value={company.trade_name}
                onChange={(e) => setCompany((c) => ({ ...c, trade_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Razão social *</Label>
              <Input
                id="legal_name"
                value={company.legal_name}
                onChange={(e) => setCompany((c) => ({ ...c, legal_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                value={company.cnpj}
                onChange={(e) => setCompany((c) => ({ ...c, cnpj: formatCNPJ(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_email">E-mail da empresa *</Label>
              <Input
                id="company_email"
                type="email"
                value={company.email}
                onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">Telefone</Label>
              <Input
                id="company_phone"
                inputMode="numeric"
                placeholder="(11) 3333-4444"
                value={company.phone}
                onChange={(e) => setCompany((c) => ({ ...c, phone: formatPhone(e.target.value) }))}
              />
            </div>
          </div>
        </section>

        <Separator />

        <div className="flex flex-col items-center gap-3">
          <Button type="submit" size="lg" loading={saving} className="w-full sm:w-auto">
            Finalizar cadastro e entrar
          </Button>
          <p className="text-xs text-muted-foreground">
            É necessário concluir esta etapa para acessar o sistema.
          </p>
        </div>
      </form>
    </div>
  );
}
