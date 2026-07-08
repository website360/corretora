import { redirect } from "next/navigation";
import { Download, FileText, Shield, ShieldCheck } from "lucide-react";
import { getPortalCustomer } from "@/services/portal-session.server";
import { getPortalData, getPortalClaims } from "@/services/portal-data.server";
import type { ContractStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { PortalBrand } from "@/modules/portal/portal-brand";
import { PortalLogout } from "@/modules/portal/portal-logout";
import { PortalClaims } from "@/modules/portal/portal-claims";

export const dynamic = "force-dynamic";

const STATUS_META: Record<ContractStatus, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  active: { label: "Ativa", variant: "success" },
  renewal: { label: "Em renovação", variant: "warning" },
  canceled: { label: "Cancelada", variant: "secondary" },
  expired: { label: "Expirada", variant: "destructive" },
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function date(d: string | null) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

export default async function PortalDashboard() {
  const { customer, company } = await getPortalCustomer();
  if (customer.portal_must_change_password) redirect("/portal/senha");

  const { contracts, productById, carrierById, attByContract } = await getPortalData(customer.id);
  const claims = await getPortalClaims(customer.id);
  const claimContractOptions = contracts.map((c) => ({
    id: c.id,
    label: c.policy_number
      ? `Apólice ${c.policy_number}`
      : c.product_id
        ? (productById.get(c.product_id) ?? "Contrato")
        : "Contrato",
  }));
  const brand = company.settings?.branding?.primaryColor ?? null;
  const firstName = customer.name.split(" ")[0] || customer.name;

  return (
    <div>
      <PortalBrand color={brand} />

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt={company.trade_name} className="h-8 w-auto" />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#1e3a8a] text-white">
                <Shield className="size-5" />
              </span>
            )}
            <span className="font-semibold">{company.trade_name}</span>
          </div>
          <PortalLogout />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe suas apólices, documentos e dados cadastrais.
          </p>
        </div>

        {/* Apólices */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="size-4" /> Minhas apólices
          </h2>

          {contracts.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Nenhuma apólice cadastrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => {
                const meta = STATUS_META[c.status] ?? STATUS_META.active;
                const docs = attByContract.get(c.id) ?? [];
                return (
                  <div key={c.id} className="rounded-2xl border bg-card p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {c.product_id ? productById.get(c.product_id) ?? "Produto" : "Apólice"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {c.carrier_id ? carrierById.get(c.carrier_id) ?? "" : ""}
                          {c.policy_number ? ` · Apólice ${c.policy_number}` : ""}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">Vigência</dt>
                        <dd>{date(c.starts_at)} – {date(c.ends_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Prêmio</dt>
                        <dd>{brl(c.premium_cents)}</dd>
                      </div>
                    </dl>

                    {docs.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Documentos</p>
                        <ul className="space-y-1.5">
                          {docs.map((d) => (
                            <li key={d.id}>
                              <a
                                href={`/api/portal/attachment/${d.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <Download className="size-4" /> {d.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Meus sinistros */}
        <PortalClaims claims={claims} contracts={claimContractOptions} />

        {/* Meus dados */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="size-4" /> Meus dados
          </h2>
          <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
            <Field label="Nome" value={customer.name} />
            <Field label="Documento" value={customer.document} />
            <Field label="E-mail" value={customer.email} />
            <Field label="Telefone" value={customer.phone} />
            {customer.address && (
              <Field
                label="Endereço"
                value={[
                  customer.address.street && `${customer.address.street}, ${customer.address.number ?? ""}`,
                  customer.address.district,
                  customer.address.city && `${customer.address.city}/${customer.address.state ?? ""}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                full
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
