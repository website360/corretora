"use client";

import * as React from "react";
import { CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { maskCEP, maskDocument, maskPhone } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CardPayload {
  card: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  holder: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

/** Collects credit-card + holder data and hands the payload to `onSubmit`. */
export function CardCheckoutForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (payload: CardPayload) => Promise<void>;
}) {
  const { user } = useSession();
  const [saving, setSaving] = React.useState(false);

  const [number, setNumber] = React.useState("");
  const [holderName, setHolderName] = React.useState(user.name);
  const [expiry, setExpiry] = React.useState("");
  const [cvv, setCvv] = React.useState("");
  const [email, setEmail] = React.useState(user.email);
  const [doc, setDoc] = React.useState("");
  const [cep, setCep] = React.useState("");
  const [addressNumber, setAddressNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");

  function maskCard(v: string) {
    return v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();
  }
  function maskExpiry(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  const valid =
    number.replace(/\s/g, "").length >= 13 &&
    holderName.trim() &&
    /^\d{2}\/\d{2}$/.test(expiry) &&
    cvv.length >= 3 &&
    doc.replace(/\D/g, "").length >= 11 &&
    cep.replace(/\D/g, "").length === 8 &&
    addressNumber.trim() &&
    phone.replace(/\D/g, "").length >= 10;

  async function handle() {
    if (!valid) {
      toast.error("Preencha todos os dados do cartão e do titular.");
      return;
    }
    setSaving(true);
    const [mm = "", aa = ""] = expiry.split("/");
    try {
      await onSubmit({
        card: {
          holderName,
          number: number.replace(/\s/g, ""),
          expiryMonth: mm,
          expiryYear: `20${aa}`,
          ccv: cvv,
        },
        holder: { name: holderName, email, cpfCnpj: doc, postalCode: cep, addressNumber, phone },
      });
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível processar.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CreditCard className="size-4" /> Dados do cartão
      </div>
      <div className="space-y-2">
        <Label>Número do cartão</Label>
        <Input
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={number}
          onChange={(e) => setNumber(maskCard(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label>Nome impresso no cartão</Label>
        <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Validade (MM/AA)</Label>
          <Input
            inputMode="numeric"
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => setExpiry(maskExpiry(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>CVV</Label>
          <Input
            inputMode="numeric"
            placeholder="123"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
      </div>

      <div className="pt-2 text-sm font-semibold">Dados do titular</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>CPF/CNPJ</Label>
          <Input value={doc} onChange={(e) => { maskDocument(e); setDoc(e.target.value); }} />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={phone} onChange={(e) => { maskPhone(e); setPhone(e.target.value); }} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>E-mail</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input value={cep} onChange={(e) => { maskCEP(e); setCep(e.target.value); }} />
        </div>
        <div className="space-y-2">
          <Label>Número</Label>
          <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
        </div>
      </div>

      <Button className="w-full" loading={saving} onClick={handle}>
        <Lock className="size-4" /> {submitLabel}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock className="size-3" /> Pagamento processado com segurança pela Asaas. Sem cobrança
        durante o teste.
      </p>
    </div>
  );
}
