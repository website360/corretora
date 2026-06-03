"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Mail, Phone, Plus } from "lucide-react";
import { companiesService } from "@/services/companies.service";
import { usersService } from "@/services/users.service";
import { customersService } from "@/services/customers.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { companySchema, type CompanyFormValues } from "@/lib/validations";
import { maskCNPJ, maskPhone } from "@/lib/masks";
import { formatPhone } from "@/utils/format";
import type { Company, PlanTier } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/utils";
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

const PLAN_VARIANT: Record<PlanTier, "secondary" | "default" | "warning"> = {
  starter: "secondary",
  professional: "default",
  enterprise: "warning",
};

const PLAN_LABEL: Record<PlanTier, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export function CompaniesView() {
  const { data, loading, refetch } = useAsyncData(() => companiesService.list());
  const { data: users } = useAsyncData(() => usersService.list());
  const { data: customers } = useAsyncData(() => customersService.list());
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { status: "active", plan: "starter" },
  });

  async function onSubmit(values: CompanyFormValues) {
    await companiesService.create({
      legal_name: values.legal_name,
      trade_name: values.trade_name,
      cnpj: values.cnpj,
      email: values.email,
      phone: values.phone,
      status: values.status,
      plan: values.plan,
      plan_id: null,
      subscription_status: "trialing",
      trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      asaas_customer_id: null,
      asaas_subscription_id: null,
      card_last4: null,
      card_brand: null,
      settings: {},
      address: null,
      logo_url: null,
    });
    toast.success("Empresa criada com sucesso");
    reset();
    setOpen(false);
    refetch();
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Empresas"
        description="Painel multi-tenant — gerencie todas as corretoras da plataforma."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Nova empresa
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              userCount={users?.filter((u) => u.company_id === company.id).length ?? 0}
              customerCount={customers?.filter((c) => c.company_id === company.id).length ?? 0}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova empresa</DialogTitle>
            <DialogDescription>Cadastre uma nova corretora na plataforma.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Razão social *</Label>
                <Input id="legal_name" {...register("legal_name")} />
                {errors.legal_name && (
                  <p className="text-xs text-destructive">{errors.legal_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="trade_name">Nome fantasia *</Label>
                <Input id="trade_name" {...register("trade_name")} />
                {errors.trade_name && (
                  <p className="text-xs text-destructive">{errors.trade_name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                {...register("cnpj", { onChange: maskCNPJ })}
              />
              {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  {...register("phone", { onChange: maskPhone })}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={watch("plan")} onValueChange={(v) => setValue("plan", v as PlanTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Criar empresa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyCard({
  company,
  userCount,
  customerCount,
}: {
  company: Company;
  userCount: number;
  customerCount: number;
}) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 font-semibold text-primary">
              {company.logo_url ? (
                <Building2 className="size-5" />
              ) : (
                initials(company.trade_name)
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{company.trade_name}</p>
              <p className="truncate text-xs text-muted-foreground">{company.cnpj}</p>
            </div>
          </div>
          <Badge variant={PLAN_VARIANT[company.plan]}>{PLAN_LABEL[company.plan]}</Badge>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Mail className="size-3.5" /> {company.email}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="size-3.5" /> {formatPhone(company.phone)}
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-semibold">{userCount}</span>{" "}
              <span className="text-muted-foreground">usuários</span>
            </div>
            <div>
              <span className="font-semibold">{customerCount}</span>{" "}
              <span className="text-muted-foreground">clientes</span>
            </div>
          </div>
          {company.status === "active" ? (
            <Badge variant="success">Ativa</Badge>
          ) : (
            <Badge variant="secondary">Inativa</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
