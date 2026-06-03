import { ContractProfile } from "@/modules/catalog/contract-profile";

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractProfile id={id} />;
}
