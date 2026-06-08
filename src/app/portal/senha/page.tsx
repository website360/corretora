"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/validations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";

export default function PortalPasswordPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });
  const password = watch("password") ?? "";

  async function onSubmit(values: ResetPasswordFormValues) {
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.auth.updateUser({ password: values.password });
    if (error) {
      toast.error("Não foi possível salvar. Tente entrar novamente.");
      return;
    }
    // Limpa a flag de "trocar no primeiro acesso".
    await fetch("/api/portal/password", { method: "POST" }).catch(() => {});
    toast.success("Senha definida! Bem-vindo(a).");
    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#1e3a8a] text-white">
            <Shield className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Crie sua senha</h1>
            <p className="text-sm text-muted-foreground">
              Defina uma senha segura para o seu primeiro acesso.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <PasswordInput
              id="password"
              placeholder="Crie uma senha forte"
              startIcon={<Lock />}
              {...register("password")}
            />
            <PasswordStrength value={password} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <PasswordInput
              id="confirm"
              placeholder="Repita a senha"
              startIcon={<Lock />}
              {...register("confirm")}
            />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Salvar e entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
