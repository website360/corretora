"use client";

import { useSession } from "@/contexts/session-context";
import { PageHeader } from "@/components/common/page-header";
import { KanbanDashboard } from "@/modules/dashboard/kanban-dashboard";

export default function DashboardPage() {
  const { user } = useSession();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title={`Olá, ${firstName} 👋`}
        description="Indicadores dos seus Kanbans de Tarefas e Agenda."
      />
      <KanbanDashboard />
    </div>
  );
}
