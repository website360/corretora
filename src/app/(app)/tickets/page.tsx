import { Suspense } from "react";
import type { Metadata } from "next";
import { TasksView } from "@/modules/tickets/tasks-view";

export const metadata: Metadata = { title: "Tarefas" };

export default function TarefasPage() {
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  );
}
