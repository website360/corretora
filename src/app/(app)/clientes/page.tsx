import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomersView } from "@/modules/customers/customers-view";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <Suspense>
      <CustomersView />
    </Suspense>
  );
}
