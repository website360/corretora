import { calendarService } from "@/services/calendar.service";
import { ticketsService } from "@/services/tickets.service";
import type { CalendarEvent, Ticket } from "@/types/domain";

/**
 * Finalização de tarefas/eventos é controlada por STATUS — independente da
 * etapa (coluna do kanban). Mover um card para uma coluna chamada "Finalizada"
 * NÃO finaliza a tarefa; só o status faz isso.
 */
export async function finalizeTask(ticket: Ticket): Promise<void> {
  await ticketsService.setStatus(ticket.id, "closed");
}

export async function reopenTask(ticket: Ticket): Promise<void> {
  await ticketsService.setStatus(ticket.id, "open");
}

export async function finalizeEvent(event: CalendarEvent): Promise<void> {
  await calendarService.update(event.id, { finished: true });
}

export async function reopenEvent(event: CalendarEvent): Promise<void> {
  await calendarService.update(event.id, { finished: false });
}
