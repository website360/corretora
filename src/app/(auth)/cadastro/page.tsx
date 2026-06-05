"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterFormValues } from "@/lib/validations";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeEmail, titleCase } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    const name = titleCase(values.name);
    const email = normalizeEmail(values.email);
    const company = titleCase(values.company);
    if (!env.useMocks) {
      const sb = getSupabaseBrowserClient();
      const { data, error } = await sb.auth.signUp({
        email,
        password: values.password,
        options: { data: { name, company, role: "admin" } },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      // When e-mail confirmation is enabled there is no active session yet.
      if (!data.session) {
        toast.success("Conta criada! Confirme seu e-mail para entrar.");
        router.push("/login");
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 900));
    }
    toast.success("Corretora criada! Escolha seu plano para começar.");
    router.push("/escolher-plano");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Criar sua corretora</h1>
        <p className="text-sm text-muted-foreground">
          Comece grátis. Sem cartão de crédito.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name">Seu nome</Label>
            <Input id="name" placeholder="Marina Albuquerque" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Corretora</Label>
            <Input id="company" placeholder="Fibria Seguros" {...register("company")} />
            {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail corporativo</Label>
          <Input id="email" type="email" placeholder="voce@corretora.com.br" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" placeholder="Mínimo 8 caracteres" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" type="password" placeholder="Repita a senha" {...register("confirm")} />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
