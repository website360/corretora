"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { customerSchema, type CustomerFormValues } from "@/lib/validations";
import { customersService } from "@/services/customers.service";
import { usersService } from "@/services/users.service";
import { tagsService } from "@/services/tags.service";
import { kanbanService } from "@/services/kanban.service";
import { lookupCep } from "@/services/cep.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { maskCEP, maskDocument, maskPhone } from "@/lib/masks";
import { formatCEP } from "@/utils/format";
import { normalizeEmail, titleCase } from "@/lib/utils";
import type { Address, Customer } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import { ManageTagsLink } from "@/components/common/manage-tags-link";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved?: (customer: Customer) => void;
  /** Preselects the lead's kanban placement when creating from a board. */
  defaultKind?: "lead" | "client";
  defaultBoardId?: string | null;
  defaultColumnId?: string | null;
  /** Hides the Lead/Cliente toggle and forces the kind (e.g. "Novo lead"). */
  lockKind?: boolean;
}

const emptyAddress: Address = {
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  zip: "",
};

/** ISO (UTC) → valor de um <input type="datetime-local"> no fuso local. */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
  defaultKind,
  defaultBoardId,
  defaultColumnId,
  lockKind,
}: CustomerFormDialogProps) {
  const editing = Boolean(customer);
  const { data: users } = useAsyncData(() => usersService.list());
  const { data: tags } = useAsyncData(() => tagsService.list("customers"));
  const { data: boards } = useAsyncData(() => kanbanService.listBoards());
  const [address, setAddress] = React.useState<Address>(emptyAddress);
  const [cepLoading, setCepLoading] = React.useState(false);
  const [boardId, setBoardId] = React.useState<string>("");
  const [columnId, setColumnId] = React.useState<string>("");
  const [columns, setColumns] = React.useState<{ id: string; name: string }[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { kind: "lead", person_type: "individual", status: "active", tags: [] },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        kind: customer?.kind ?? defaultKind ?? "lead",
        person_type: customer?.person_type ?? "individual",
        name: customer?.name ?? "",
        document: customer?.document ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        birth_date: customer?.birth_date ?? "",
        notes: customer?.notes ?? "",
        tags: customer?.tags ?? [],
        owner_id: customer?.owner_id ?? undefined,
        status: customer?.status ?? "active",
        next_contact_at: customer?.next_contact_at
          ? isoToLocalInput(customer.next_contact_at)
          : "",
      });
      setAddress(customer?.address ?? emptyAddress);
      setBoardId(customer?.board_id ?? defaultBoardId ?? "");
      setColumnId(customer?.column_id ?? defaultColumnId ?? "");
    }
  }, [open, customer, reset, defaultKind, defaultBoardId, defaultColumnId]);

  // Load columns whenever the selected board changes.
  React.useEffect(() => {
    if (!boardId) {
      setColumns([]);
      return;
    }
    let active = true;
    kanbanService.listColumns(boardId).then((cols) => {
      if (!active) return;
      setColumns(cols.map((c) => ({ id: c.id, name: c.name })));
      // Ensure the selected column belongs to this board.
      setColumnId((prev) => (cols.some((c) => c.id === prev) ? prev : (cols[0]?.id ?? "")));
    });
    return () => {
      active = false;
    };
  }, [boardId]);

  async function handleCep(value: string) {
    const masked = formatCEP(value);
    setAddress((a) => ({ ...a, zip: masked }));
    if (masked.replace(/\D/g, "").length === 8) {
      setCepLoading(true);
      const found = await lookupCep(masked);
      setCepLoading(false);
      if (found) {
        setAddress((a) => ({
          ...a,
          street: found.street || a.street,
          district: found.district || a.district,
          city: found.city || a.city,
          state: found.state || a.state,
        }));
      } else {
        toast.error("CEP não encontrado");
      }
    }
  }

  function updateAddress(field: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [field]: value }));
  }

  async function onSubmit(values: CustomerFormValues) {
    const hasAddress = address.zip || address.street || address.city;
    const isLead = values.kind === "lead";
    // A lead must always live on a kanban — fall back to the default board's
    // first column so it never becomes invisible.
    let finalBoard = boardId;
    let finalColumn = columnId;
    if (isLead && !finalBoard) {
      try {
        const boards = await kanbanService.listBoards();
        const board = boards[0];
        if (board) {
          finalBoard = board.id;
          const cols = await kanbanService.listColumns(board.id);
          finalColumn = cols[0]?.id ?? "";
        }
      } catch {
        /* ignore — lead saved without board */
      }
    }
    const payload = {
      ...values,
      name: titleCase(values.name),
      email: values.email ? normalizeEmail(values.email) : null,
      phone: values.phone || null,
      notes: values.notes || null,
      birth_date: values.birth_date || null,
      address: hasAddress ? address : null,
      owner_id: values.owner_id ?? null,
      board_id: isLead ? finalBoard || null : null,
      column_id: isLead ? finalColumn || null : null,
      next_contact_at:
        isLead && values.next_contact_at
          ? new Date(values.next_contact_at).toISOString()
          : null,
    };
    const saved = editing
      ? await customersService.update(customer!.id, payload)
      : await customersService.create(payload as Omit<Customer, "id" | "company_id" | "created_at">);
    toast.success(editing ? "Contato atualizado" : "Contato criado com sucesso");
    onSaved?.(saved);
    onOpenChange(false);
  }

  const personType = watch("person_type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Editar ${lockKind ? "lead" : "contato"}` : `Novo ${lockKind ? "lead" : "contato"}`}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do {lockKind ? "lead" : "contato"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!lockKind && (
            <div className="space-y-2">
              <Label>Classificação</Label>
              <div className="inline-flex w-full rounded-lg border bg-muted/40 p-0.5">
                {([
                  { value: "lead", label: "Lead" },
                  { value: "client", label: "Cliente" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue("kind", opt.value)}
                    className={
                      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                      (watch("kind") === opt.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {watch("kind") === "lead" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-dashed bg-muted/20 p-3">
              <div className="space-y-2">
                <Label>Kanban</Label>
                <Select value={boardId} onValueChange={setBoardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o kanban" />
                  </SelectTrigger>
                  <SelectContent>
                    {(boards ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bloco</Label>
                <Select value={columnId} onValueChange={setColumnId} disabled={!boardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bloco" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="next_contact_at">Próximo contato</Label>
                <Input
                  id="next_contact_at"
                  type="datetime-local"
                  {...register("next_contact_at")}
                />
                <p className="text-xs text-muted-foreground">
                  Aparece no calendário de leads no dia agendado.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={personType}
                onValueChange={(v) => setValue("person_type", v as "individual" | "company")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Pessoa Física</SelectItem>
                  <SelectItem value="company">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">{personType === "company" ? "CNPJ" : "CPF"}</Label>
              <Input
                id="document"
                inputMode="numeric"
                placeholder={personType === "company" ? "00.000.000/0000-00" : "000.000.000-00"}
                {...register("document", { onChange: maskDocument })}
              />
              {errors.document && (
                <p className="text-xs text-destructive">{errors.document.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {personType === "company" ? "Razão social" : "Nome completo"}
            </Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                {...register("phone", { onChange: maskPhone })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="birth_date">
                {personType === "company" ? "Data de fundação" : "Data de nascimento"}
              </Label>
              <Input id="birth_date" type="date" {...register("birth_date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Responsável interno</Label>
              <Combobox
                options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
                value={watch("owner_id") ?? ""}
                onChange={(v) => setValue("owner_id", v || undefined)}
                placeholder="Selecione"
                searchPlaceholder="Buscar usuário..."
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Address with CEP auto-lookup */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="zip">CEP</Label>
                <Input
                  id="zip"
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={address.zip}
                  onChange={(e) => handleCep(e.target.value)}
                  startIcon={cepLoading ? <Loader2 className="animate-spin" /> : undefined}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Rua</Label>
                <Input value={address.street} onChange={(e) => updateAddress("street", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={address.number} onChange={(e) => updateAddress("number", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Complemento</Label>
                <Input
                  value={address.complement ?? ""}
                  onChange={(e) => updateAddress("complement", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3 space-y-2">
                <Label>Bairro</Label>
                <Input value={address.district} onChange={(e) => updateAddress("district", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Cidade</Label>
                <Input value={address.city} onChange={(e) => updateAddress("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input
                  maxLength={2}
                  value={address.state}
                  onChange={(e) => updateAddress("state", e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <MultiSelect
              options={(tags ?? []).map((t) => ({ value: t.name, label: t.name }))}
              values={watch("tags") ?? []}
              onChange={(v) => setValue("tags", v)}
              placeholder="Nenhuma"
              searchPlaceholder="Buscar etiqueta..."
              emptyText="Nenhuma etiqueta. Crie em Configurações → Etiquetas."
              triggerClassName="w-full"
              footer={<ManageTagsLink />}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Salvar alterações" : `Criar ${lockKind ? "lead" : "contato"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
