"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { usersService } from "@/services/users.service";
import { plansService } from "@/services/plans.service";
import { effectiveLimits, withinLimit } from "@/services/billing.service";
import { useSession } from "@/contexts/session-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatPhone, formatRelative } from "@/utils/format";
import { InlineSelect } from "@/components/common/inline-select";
import { ROLE_LABELS, type Role, type User } from "@/types/domain";

const ROLE_OPTIONS = (["admin", "broker", "assistant"] as Role[]).map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/common/user-avatar";
import { normalizeEmail, titleCase } from "@/lib/utils";
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

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "success" | "warning"> = {
  super_admin: "warning",
  admin: "default",
  broker: "success",
  assistant: "secondary",
};

const createSchema = z.object({
  name: z.string().min(3, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "broker", "assistant"]),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});
type CreateValues = z.infer<typeof createSchema>;

function generatePassword() {
  return "Cor" + Math.random().toString(36).slice(2, 8) + "!" + Math.floor(Math.random() * 90 + 10);
}

export function UsersView() {
  const { user } = useSession();
  const { data, loading, refetch } = useAsyncData(() => usersService.list());
  const { data: plans } = useAsyncData(() => plansService.list());
  const [open, setOpen] = React.useState(false);

  const userLimit = plans ? effectiveLimits(user.company, plans).maxUsers : null;
  const usersUsed = (data ?? []).length;
  const canAddUser = withinLimit(usersUsed, userLimit);

  function guardAddUser() {
    if (!canAddUser) {
      toast.error(
        `Limite de ${userLimit} usuários do seu plano atingido. Faça upgrade para adicionar mais.`,
      );
      return;
    }
    setOpen(true);
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "broker", password: generatePassword() },
  });

  async function onCreate(values: CreateValues) {
    try {
      const normalized = {
        ...values,
        name: titleCase(values.name),
        email: normalizeEmail(values.email),
      };
      await usersService.createUser(normalized);
      toast.success(`Usuário ${normalized.name} criado`, {
        description: `Senha temporária: ${values.password}`,
        duration: 8000,
      });
      reset({ name: "", email: "", role: "broker", password: generatePassword() });
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Usuário",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.original.name} src={row.original.avatar_url} className="size-9" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">
              {row.original.name}
              {row.original.is_owner && (
                <Badge variant="secondary" className="gap-1 text-primary">
                  <ShieldCheck className="size-3" /> Dono
                </Badge>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: "job_title", header: "Cargo", cell: ({ row }) => row.original.job_title ?? "—" },
    {
      accessorKey: "phone",
      header: "Telefone",
      cell: ({ row }) => (row.original.phone ? formatPhone(row.original.phone) : "—"),
    },
    {
      accessorKey: "role",
      header: "Função",
      cell: ({ row }) => (
        <InlineSelect
          value={row.original.role}
          options={ROLE_OPTIONS}
          title="Trocar função"
          onChange={async (v) => {
            await usersService.update(row.original.id, { role: v as Role });
            refetch();
          }}
        >
          <Badge variant={ROLE_VARIANT[row.original.role]}>{ROLE_LABELS[row.original.role]}</Badge>
        </InlineSelect>
      ),
    },
    {
      accessorKey: "last_seen_at",
      header: "Visto por último",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.last_seen_at ? formatRelative(row.original.last_seen_at) : "Nunca"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <InlineSelect
          value={row.original.status}
          options={[
            { value: "active", label: "Ativo" },
            { value: "inactive", label: "Inativo" },
          ]}
          title="Trocar status"
          onChange={async (v) => {
            await usersService.update(row.original.id, { status: v as User["status"] });
            refetch();
          }}
        >
          {row.original.status === "active" ? (
            <Badge variant="success">Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </InlineSelect>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Usuários"
        description="Gerencie a equipe da sua corretora e suas permissões."
        actions={
          <Button onClick={guardAddUser}>
            <UserPlus /> Adicionar usuário
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        emptyIcon={Users}
        emptyTitle="Nenhum usuário"
        emptyDescription="Adicione membros da equipe para colaborar."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
            <DialogDescription>
              O usuário é criado já ativo. Compartilhe a senha temporária com ele.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u-name">Nome</Label>
              <Input id="u-name" placeholder="Nome completo" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">E-mail</Label>
              <Input
                id="u-email"
                type="email"
                placeholder="colega@corretora.com.br"
                startIcon={<Mail />}
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={watch("role")} onValueChange={(v) => setValue("role", v as CreateValues["role"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin da Empresa</SelectItem>
                    <SelectItem value="broker">Corretor</SelectItem>
                    <SelectItem value="assistant">Assistente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-pass">Senha temporária</Label>
                <Input id="u-pass" {...register("password")} />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Criar usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
