import type { Metadata } from "next";
import { UsersView } from "@/modules/users/users-view";

export const metadata: Metadata = { title: "Usuários" };

export default function UsuariosPage() {
  return <UsersView />;
}
