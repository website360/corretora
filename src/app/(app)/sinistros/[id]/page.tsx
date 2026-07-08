import { ClaimProfile } from "@/modules/claims/claim-profile";

export default async function SinistroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClaimProfile id={id} />;
}
