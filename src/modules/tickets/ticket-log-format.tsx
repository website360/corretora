import * as React from "react";
import {
  CalendarClock,
  CircleDot,
  Flag,
  History,
  Pencil,
  Plus,
  Tag,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { findUser } from "@/services/lookup";
import { TICKET_PRIORITY_META, TICKET_STATUS_META } from "@/config/domain";
import { formatShortDate } from "@/utils/format";
import type { TicketEventType, TicketPriority, TicketStatus } from "@/types/domain";

function actorName(id: string | null | undefined): string {
  return (id && findUser(id)?.name) || "Sistema";
}

/**
 * Converte um evento de `ticket_logs` numa frase legível em pt-BR
 * ("mudou o status de X para Y", "atribuiu para Fulano"). Fonte única usada
 * tanto no histórico da tarefa quanto na timeline de atividades do cliente.
 */
export function describeTicketLog(
  event: TicketEventType,
  meta: Record<string, unknown> = {},
): string {
  const statusLabel = (s: unknown) => TICKET_STATUS_META[s as TicketStatus]?.label ?? String(s);
  switch (event) {
    case "created":
      return "criou a tarefa";
    case "status_changed": {
      const to = meta?.to ? statusLabel(meta.to) : null;
      const from = meta?.from ? statusLabel(meta.from) : null;
      if (from && to) return `mudou o status de ${from} para ${to}`;
      if (to) return `mudou o status para ${to}`;
      return "mudou o status";
    }
    case "priority_changed": {
      const to = meta?.to
        ? (TICKET_PRIORITY_META[meta.to as TicketPriority]?.label ?? String(meta.to))
        : null;
      return to ? `alterou a prioridade para ${to}` : "alterou a prioridade";
    }
    case "assigned": {
      const to = meta?.to ? actorName(String(meta.to)) : null;
      return to ? `atribuiu para ${to}` : "removeu o responsável";
    }
    case "participant_added": {
      const who = meta?.to ? actorName(String(meta.to)) : null;
      return who ? `adicionou ${who} aos envolvidos` : "adicionou um envolvido";
    }
    case "participant_removed": {
      const who = meta?.to ? actorName(String(meta.to)) : null;
      return who ? `removeu ${who} dos envolvidos` : "removeu um envolvido";
    }
    case "tag_added":
      return meta?.tag ? `adicionou a etiqueta "${String(meta.tag)}"` : "adicionou uma etiqueta";
    case "tag_removed":
      return meta?.tag ? `removeu a etiqueta "${String(meta.tag)}"` : "removeu uma etiqueta";
    case "due_changed": {
      const to = meta?.to ? formatShortDate(String(meta.to)) : null;
      const reason = meta?.reason ? ` — motivo: ${String(meta.reason)}` : "";
      return (to ? `alterou o prazo para ${to}` : "alterou o prazo") + reason;
    }
    case "due_removed": {
      const reason = meta?.reason ? ` — motivo: ${String(meta.reason)}` : "";
      return "removeu o prazo" + reason;
    }
    case "edited":
      return "editou a tarefa";
    case "comment_deleted":
      return "removeu um comentário";
    case "comment":
      return "comentou";
    default:
      return "atualizou a tarefa";
  }
}

/** Ícone (lucide) associado a cada tipo de evento de tarefa. */
export function ticketLogIcon(
  event: TicketEventType,
): React.ComponentType<{ className?: string }> {
  switch (event) {
    case "created":
      return Plus;
    case "status_changed":
      return CircleDot;
    case "priority_changed":
      return Flag;
    case "assigned":
      return UserRound;
    case "participant_added":
    case "participant_removed":
      return Users;
    case "tag_added":
    case "tag_removed":
      return Tag;
    case "due_changed":
    case "due_removed":
      return CalendarClock;
    case "edited":
      return Pencil;
    case "comment_deleted":
      return Trash2;
    default:
      return History;
  }
}
