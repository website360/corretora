import { redirect } from "next/navigation";

// Agenda foi unificada com Tarefas (visualização Calendário em /tickets).
export default function AgendaPage() {
  redirect("/tickets");
}
