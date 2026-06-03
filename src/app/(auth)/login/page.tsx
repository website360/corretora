"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginFormValues } from "@/lib/validations";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: env.useMocks
      ? { email: "marina@apexseguros.com.br", password: "demo1234" }
      : undefined,
  });

  async function onSubmit(values: LoginFormValues) {
    if (!env.useMocks) {
      const sb = getSupabaseBrowserClient();
      const { error } = await sb.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error("E-mail ou senha inválidos");
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 700));
    }
    toast.success("Bem-vindo de volta!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Acessar conta</h1>
        <p className="text-sm text-muted-foreground">
          Entre com seu e-mail e senha para continuar.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@corretora.com.br"
            startIcon={<Mail />}
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="/recuperar-senha" className="text-xs font-medium text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            startIcon={<Lock />}
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary hover:underline">
          Criar corretora
        </Link>
      </p>
    </div>
  );
}
