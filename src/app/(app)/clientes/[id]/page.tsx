import { CustomerProfile } from "@/modules/customers/customer-profile";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerProfile id={id} />;
}
