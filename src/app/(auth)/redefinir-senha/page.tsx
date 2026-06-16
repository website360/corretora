"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/validations";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";

export default function ResetPasswordPage() {
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
    if (!env.useMocks) {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb.auth.updateUser({ password: values.password });
      if (error) {
        toast.error("Não foi possível redefinir. Abra o link do e-mail novamente.");
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 700));
    }
    toast.success("Senha redefinida! Use a nova senha para entrar.");
    window.location.assign("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Definir nova senha</h1>
        <p className="text-sm text-muted-foreground">
          Crie uma senha forte para proteger sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            placeholder="Repita a nova senha"
            startIcon={<Lock />}
            {...register("confirm")}
          />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Redefinir senha
        </Button>
      </form>
    </div>
  );
}
