"use client";

import { useDirectoryStore } from "@/stores/directory-store";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Picks which kanban board + column (bloco) a task/event lands in.
 * Reads boards/columns from the directory store (loaded by `useDirectory`).
 */
export function BoardColumnPicker({
  boardId,
  columnId,
  onBoardChange,
  onColumnChange,
}: {
  boardId: string;
  columnId: string;
  onBoardChange: (id: string) => void;
  onColumnChange: (id: string) => void;
}) {
  const boards = useDirectoryStore((s) => s.taskBoards);
  const allColumns = useDirectoryStore((s) => s.taskColumns);
  const columns = allColumns
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position);

  function handleBoard(id: string) {
    onBoardChange(id);
    const first = allColumns
      .filter((c) => c.board_id === id)
      .sort((a, b) => a.position - b.position)[0];
    onColumnChange(first?.id ?? "");
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Kanban</Label>
        <Select value={boardId} onValueChange={handleBoard}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o kanban" />
          </SelectTrigger>
          <SelectContent>
            {boards.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Bloco</Label>
        <Select value={columnId} onValueChange={onColumnChange} disabled={!boardId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o bloco" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Default board id (the system default, else the first board). */
export function defaultBoardId(boards: { id: string; is_default: boolean; position: number }[]) {
  return (boards.find((b) => b.is_default) ?? [...boards].sort((a, b) => a.position - b.position)[0])
    ?.id;
}
