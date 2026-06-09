import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Link "Gerenciar etiquetas" para o rodapé (`footer`) de um MultiSelect de
 * etiquetas — leva direto a Configurações → Etiquetas.
 */
export function ManageTagsLink() {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="w-full justify-start text-xs text-muted-foreground"
    >
      <Link href="/configuracoes?tab=tags">
        <Settings2 className="size-4" /> Gerenciar etiquetas
      </Link>
    </Button>
  );
}
