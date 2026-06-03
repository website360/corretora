import { CarrierProfile } from "@/modules/catalog/carrier-profile";

export default async function CompanhiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CarrierProfile id={id} />;
}
