import type { Metadata } from "next";
import { CompaniesView } from "@/modules/companies/companies-view";

export const metadata: Metadata = { title: "Empresas" };

export default function EmpresasPage() {
  return <CompaniesView />;
}
