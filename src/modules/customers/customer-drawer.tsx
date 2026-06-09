"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  SquareArrowOutUpRight,
  User as UserIcon,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { findUser } from "@/services/lookup";
import { customersService } from "@/services/customers.service";
import { formatDocument, formatPhone } from "@/utils/format";
import { TONE_BADGE_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { Customer, StageColor } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/common/tag-badge";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomerFormDialog } from "@/modules/customers/customer-form-dialog";

/** Quick-view drawer for a contact, mirroring the event drawer. */
export function CustomerDrawer({
  customer,
  open,
  onOpenChange,
  onChanged,
  tagColor,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
  tagColor: (name: string) => string;
}) {
  const [shown, setShown] = React.useState<Customer | null>(customer);
  const [editOpen, setEditOpen] = React.useState(false);
  const [converting, setConverting] = React.useState(false);

  React.useEffect(() => {
    if (customer) setShown(customer);
  }, [customer]);

  async function convertToClient() {
    if (!shown) return;
    setConverting(true);
    try {
      await customersService.update(shown.id, { kind: "client", board_id: null, column_id: null });
      toast.success(`${shown.name || "Lead"} virou um cliente`);
      setShown({ ...shown, kind: "client", board_id: null, column_id: null });
      onChanged?.();
    } catch {
      toast.error("Não foi possível converter o lead.");
    } finally {
      setConverting(false);
    }
  }

  const owner = findUser(shown?.owner_id);
  const address = shown?.address;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          {shown && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-1.5 pr-8">
                  {shown.kind === "client" ? (
                    <Badge variant="success">Cliente</Badge>
                  ) : (
                    <Badge variant="warning">Lead</Badge>
                  )}
                  {shown.status === "active" ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                  {shown.tags.map((t) => (
                    <TagBadge key={t} name={t} color={tagColor(t)} />
                  ))}
                </div>
                <SheetTitle>{shown.name || "Sem nome"}</SheetTitle>
                <SheetDescription>
                  {shown.person_type === "company" ? "Pessoa Jurídica" : "Pessoa Física"}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {shown.document && (
                  <Row icon={shown.person_type === "company" ? Building2 : UserIcon} label="Documento">
                    {formatDocument(shown.document)}
                  </Row>
                )}
                {shown.email && (
                  <Row icon={Mail} label="E-mail">
                    {shown.email}
                  </Row>
                )}
                {shown.phone && (
                  <Row icon={Phone} label="Telefone">
                    {formatPhone(shown.phone)}
                  </Row>
                )}
                {address && (address.street || address.city) && (
                  <Row icon={MapPin} label="Endereço">
                    {[address.street, address.number].filter(Boolean).join(", ")}
                    {address.city ? ` — ${address.city}/${address.state}` : ""}
                  </Row>
                )}

                {owner && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <UserIcon className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Responsável</p>
                        <div className="mt-1 flex items-center gap-2">
                          <UserAvatar name={owner.name} src={owner.avatar_url} className="size-6" />
                          <span className="text-sm font-medium">{owner.name}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {shown.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Observações
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {shown.notes}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <SheetFooter>
                <Button variant="outline" asChild>
                  <Link href={`${shown.kind === "lead" ? "/leads" : "/clientes"}/${shown.id}`}>
                    <SquareArrowOutUpRight /> Abrir
                  </Link>
                </Button>
                {shown.kind === "lead" && (
                  <Button variant="outline" onClick={convertToClient} loading={converting}>
                    <UserCheck /> Converter
                  </Button>
                )}
                <Button className="flex-1" onClick={() => setEditOpen(true)}>
                  <Pencil /> Editar
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={shown}
        onSaved={(c) => {
          setShown(c);
          onChanged?.();
        }}
      />
    </>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{children}</p>
      </div>
    </div>
  );
}
