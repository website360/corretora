import { calendarService } from "@/services/calendar.service";
import { taskBoardsService } from "@/services/task-boards.service";
import { useDirectoryStore } from "@/stores/directory-store";
import type { CalendarEvent, Ticket } from "@/types/domain";

/** A terminal (conclusion) column on the given board, else its last column. */
export function terminalColumnId(boardId?: string | null): string | undefined {
  const cols = useDirectoryStore
    .getState()
    .taskColumns.filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position);
  if (cols.length === 0) return undefined;
  return (cols.find((c) => c.is_terminal) ?? cols[cols.length - 1])!.id;
}

export async function finalizeTask(ticket: Ticket): Promise<void> {
  const colId = terminalColumnId(ticket.board_id);
  if (colId && ticket.board_id) {
    await taskBoardsService.moveCard("task", ticket.id, ticket.board_id, colId);
  }
}

export async function finalizeEvent(event: CalendarEvent): Promise<void> {
  await calendarService.update(event.id, { finished: true });
  const colId = terminalColumnId(event.board_id);
  if (colId && event.board_id) {
    await taskBoardsService.moveCard("event", event.id, event.board_id, colId);
  }
}
