import type { CalendarEvent, Ticket } from "@/types/domain";

/**
 * Um prazo está em atraso conforme a granularidade configurada pela empresa
 * (Configurações → Preferências → "Horário nas tarefas"):
 *
 * - com horário  → atrasa no minuto seguinte ao prazo (14:00 fica atrasado às 14:01);
 * - só por dia   → atrasa apenas na virada da meia-noite (ontem está atrasado, hoje não).
 */
export function isOverdue(
  due: string | null | undefined,
  withTime: boolean,
  now: number = Date.now(),
): boolean {
  if (!due) return false;
  const d = new Date(due);
  if (Number.isNaN(+d)) return false;
  if (withTime) return +d < now;
  // Só dia: o prazo só vence quando o dia inteiro termina.
  const endOfDueDay = new Date(d);
  endOfDueDay.setHours(24, 0, 0, 0);
  return +endOfDueDay <= now;
}

/** Tarefa atrasada — finalizadas nunca contam. */
export function isTaskOverdue(
  task: Pick<Ticket, "due_at" | "status">,
  taskTimeEnabled: boolean,
  now?: number,
): boolean {
  if (task.status === "closed") return false;
  return isOverdue(task.due_at, taskTimeEnabled, now);
}

/**
 * Evento atrasado — finalizados nunca contam. Conta a partir do fim do evento
 * (um evento em andamento não está atrasado). Eventos de dia todo, e empresas
 * que trabalham só por dia, usam a virada da meia-noite.
 */
export function isEventOverdue(
  event: Pick<CalendarEvent, "starts_at" | "ends_at" | "all_day" | "finished">,
  taskTimeEnabled: boolean,
  now?: number,
): boolean {
  if (event.finished) return false;
  return isOverdue(event.ends_at ?? event.starts_at, taskTimeEnabled && !event.all_day, now);
}
