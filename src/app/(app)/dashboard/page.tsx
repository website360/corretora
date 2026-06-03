"use client";

import { useSession } from "@/contexts/session-context";
import { PageHeader } from "@/components/common/page-header";

export default function DashboardPage() {
  const { user } = useSession();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={`Olá, ${firstName} 👋`}
        description="Bem-vindo à sua corretora."
      />
    </div>
  );
}
