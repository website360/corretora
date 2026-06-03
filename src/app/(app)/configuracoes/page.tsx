import type { Metadata } from "next";
import { SettingsView } from "@/modules/settings/settings-view";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return <SettingsView />;
}
