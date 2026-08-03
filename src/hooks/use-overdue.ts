"use client";

import * as React from "react";
import { resolveSettings } from "@/config/sort";
import { useSession } from "@/contexts/session-context";
import { isEventOverdue, isTaskOverdue } from "@/utils/overdue";
import type { CalendarEvent, Ticket } from "@/types/domain";

/**
 * Marcação de atraso conforme a preferência da empresa (dia x dia+horário).
 * Reavalia a cada minuto para o item ficar vermelho sozinho, sem recarregar.
 */
export function useOverdue() {
  const { user } = useSession();
  const { taskTimeEnabled } = resolveSettings(user.company);
  const [now, setNow] = React.useState<number | null>(null);

  // Só depois de montar: no SSR não há relógio do cliente, e comparar datas na
  // renderização do servidor causaria divergência de hidratação.
  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return React.useMemo(
    () => ({
      taskTimeEnabled,
      isTaskLate: (task: Pick<Ticket, "due_at" | "status">) =>
        now !== null && isTaskOverdue(task, taskTimeEnabled, now),
      isEventLate: (event: Pick<CalendarEvent, "starts_at" | "ends_at" | "all_day" | "finished">) =>
        now !== null && isEventOverdue(event, taskTimeEnabled, now),
    }),
    [taskTimeEnabled, now],
  );
}
