import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { taskStages, ticketLogs, ticketMessages, tickets } from "@/services/mock/data";
import { getCurrentCompanyId, getCurrentUserId } from "@/services/lookup";
import { useDirectoryStore } from "@/stores/directory-store";
import { extractMentionIds } from "@/lib/mentions";
import { sleep, uid } from "@/lib/utils";
import type {
  Ticket,
  TicketEventType,
  TicketLog,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from "@/types/domain";

export interface TicketFilters {
  search?: string;
  status?: TicketStatus | "all";
  /** Priorities to match (empty = any). */
  priorities?: TicketPriority[];
  /** Attribution dimensions to match `personIds` against (empty = any). */
  relations?: AttributionRelation[];
  /** People to filter by (empty = everyone). */
  personIds?: string[];
  /** Tag names; a task matches if it has any of them. */
  tags?: string[];
}

export type AttributionRelation = "assignee" | "participant" | "creator";

const ALL_RELATIONS: AttributionRelation[] = ["assignee", "participant", "creator"];

function applyFilters(list: Ticket[], filters: TicketFilters): Ticket[] {
  const search = filters.search?.toLowerCase().trim();
  const people = filters.personIds ?? [];
  const relations = filters.relations?.length ? filters.relations : ALL_RELATIONS;
  const priorities = filters.priorities ?? [];
  const tags = filters.tags ?? [];

  const matchesPerson = (t: Ticket, rel: AttributionRelation) => {
    if (rel === "creator") return t.created_by ? people.includes(t.created_by) : false;
    if (rel === "participant") return (t.participant_ids ?? []).some((id) => people.includes(id));
    return t.assignee_id ? people.includes(t.assignee_id) : false;
  };

  return list
    .filter((t) => (filters.status && filters.status !== "all" ? t.status === filters.status : true))
    .filter((t) => (priorities.length ? priorities.includes(t.priority) : true))
    .filter((t) => (people.length === 0 ? true : relations.some((rel) => matchesPerson(t, rel))))
    .filter((t) => (tags.length ? t.tags.some((tag) => tags.includes(tag)) : true))
    .filter((t) =>
      search
        ? t.title.toLowerCase().includes(search) ||
          String(t.number).includes(search) ||
          t.tags.some((tag) => tag.toLowerCase().includes(search))
        : true,
    )
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
}

export const ticketsService = {
  async list(filters: TicketFilters = {}): Promise<Ticket[]> {
    if (env.useMocks) {
      await sleep(260);
      const companyId = getCurrentCompanyId();
      return applyFilters(
        tickets.filter((t) => t.company_id === companyId),
        filters,
      );
    }

    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("tickets").select("*").is("deleted_at", null);
    if (error) throw error;
    return applyFilters((data as Ticket[]) ?? [], filters);
  },

  async get(id: string): Promise<Ticket | null> {
    if (env.useMocks) {
      await sleep(180);
      return tickets.find((t) => t.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("tickets")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    return (data as Ticket | null) ?? null;
  },

  async messages(ticketId: string): Promise<TicketMessage[]> {
    if (env.useMocks) {
      await sleep(220);
      return ticketMessages
        .filter((m) => m.ticket_id === ticketId)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    return (data as TicketMessage[]) ?? [];
  },

  async logs(ticketId: string): Promise<TicketLog[]> {
    if (env.useMocks) {
      await sleep(200);
      return ticketLogs
        .filter((l) => l.ticket_id === ticketId)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("ticket_logs")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    return (data as TicketLog[]) ?? [];
  },

  async sendMessage(
    ticketId: string,
    body: string,
    kind: "message" | "internal_note" = "message",
  ): Promise<TicketMessage> {
    // Resolve "@Nome" para os UUIDs reais dos usuários (a coluna mentions é
    // uuid[]) — gravar o texto cru fazia o insert falhar e a mensagem sumir.
    const mentions = extractMentionIds(body, useDirectoryStore.getState().users);
    if (env.useMocks) {
      await sleep(220);
      const message: TicketMessage = {
        id: uid("tm"),
        ticket_id: ticketId,
        author_id: getCurrentUserId(),
        kind,
        body,
        mentions,
        attachments: [],
        created_at: new Date().toISOString(),
        read_by: [getCurrentUserId()],
      };
      ticketMessages.push(message);
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) ticket.updated_at = message.created_at;
      return message;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        company_id: getCurrentCompanyId(),
        author_id: getCurrentUserId(),
        kind,
        body,
        mentions,
        read_by: [getCurrentUserId()],
      })
      .select("*")
      .single();
    if (error) throw error;
    await sb.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
    return data as TicketMessage;
  },

  async setStatus(ticketId: string, status: TicketStatus): Promise<void> {
    if (env.useMocks) {
      await sleep(200);
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      const from = ticket.status;
      ticket.status = status;
      ticket.updated_at = new Date().toISOString();
      ticketLogs.push({
        id: uid("tl"),
        ticket_id: ticketId,
        actor_id: getCurrentUserId(),
        event: "status_changed",
        meta: { from, to: status },
        created_at: ticket.updated_at,
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("tickets").update({ status }).eq("id", ticketId);
    await sb.from("ticket_logs").insert({
      ticket_id: ticketId,
      company_id: getCurrentCompanyId(),
      actor_id: getCurrentUserId(),
      event: "status_changed",
      meta: { to: status },
    });
  },

  async setStage(ticketId: string, stageId: string): Promise<void> {
    if (env.useMocks) {
      await sleep(160);
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) {
        ticket.stage_id = stageId;
        ticket.updated_at = new Date().toISOString();
      }
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("tickets").update({ stage_id: stageId }).eq("id", ticketId);
  },

  async setPriority(ticketId: string, priority: TicketPriority): Promise<void> {
    if (env.useMocks) {
      await sleep(200);
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) {
        ticket.priority = priority;
        ticket.updated_at = new Date().toISOString();
      }
      ticketLogs.push({
        id: uid("tl"),
        ticket_id: ticketId,
        actor_id: getCurrentUserId(),
        event: "priority_changed",
        meta: { to: priority },
        created_at: new Date().toISOString(),
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("tickets").update({ priority }).eq("id", ticketId);
    await sb.from("ticket_logs").insert({
      ticket_id: ticketId,
      company_id: getCurrentCompanyId(),
      actor_id: getCurrentUserId(),
      event: "priority_changed",
      meta: { to: priority },
    });
  },

  async assign(ticketId: string, assigneeId: string): Promise<void> {
    if (env.useMocks) {
      await sleep(200);
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) {
        ticket.assignee_id = assigneeId;
        ticket.updated_at = new Date().toISOString();
      }
      ticketLogs.push({
        id: uid("tl"),
        ticket_id: ticketId,
        actor_id: getCurrentUserId(),
        event: "assigned",
        meta: { to: assigneeId },
        created_at: new Date().toISOString(),
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("tickets").update({ assignee_id: assigneeId }).eq("id", ticketId);
    await sb.from("ticket_logs").insert({
      ticket_id: ticketId,
      company_id: getCurrentCompanyId(),
      actor_id: getCurrentUserId(),
      event: "assigned",
      meta: { to: assigneeId },
    });
  },

  /** Records an arbitrary activity-log entry for a ticket (additions/removals). */
  async logEvent(
    ticketId: string,
    event: TicketEventType,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(50);
      ticketLogs.push({
        id: uid("tl"),
        ticket_id: ticketId,
        actor_id: getCurrentUserId(),
        event,
        meta,
        created_at: new Date().toISOString(),
      });
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("ticket_logs").insert({
      ticket_id: ticketId,
      company_id: getCurrentCompanyId(),
      actor_id: getCurrentUserId(),
      event,
      meta,
    });
  },

  async create(
    input: Pick<Ticket, "title" | "description" | "priority" | "subject_type"> &
      Partial<
        Pick<
          Ticket,
          | "category"
          | "customer_id"
          | "carrier_id"
          | "product_id"
          | "contract_id"
          | "quote_id"
          | "assignee_id"
          | "tags"
          | "due_at"
          | "participant_ids"
          | "board_id"
          | "column_id"
        >
      >,
  ): Promise<Ticket> {
    const me = getCurrentUserId();
    if (env.useMocks) {
      await sleep(420);
      const nextNumber = Math.max(0, ...tickets.map((t) => t.number)) + 1;
      const ts = new Date().toISOString();
      const firstStage = [...taskStages].sort((a, b) => a.position - b.position)[0];
      const ticket: Ticket = {
        id: uid("tk"),
        company_id: getCurrentCompanyId(),
        number: nextNumber,
        title: input.title,
        description: input.description ?? null,
        status: "open",
        stage_id: firstStage?.id ?? null,
        board_id: input.board_id ?? "tb_default",
        column_id: input.column_id ?? "tc_aberto",
        priority: input.priority,
        category: input.category ?? "internal",
        subject_type: input.subject_type,
        customer_id: input.customer_id ?? null,
        carrier_id: input.carrier_id ?? null,
        product_id: input.product_id ?? null,
        contract_id: input.contract_id ?? null,
        quote_id: input.quote_id ?? null,
        assignee_id: input.assignee_id ?? null,
        created_by: me,
        participant_ids: input.participant_ids ?? [],
        tags: input.tags ?? [],
        unread_count: 0,
        due_at: input.due_at ?? null,
        created_at: ts,
        updated_at: ts,
      };
      tickets.unshift(ticket);
      ticketLogs.push({
        id: uid("tl"),
        ticket_id: ticket.id,
        actor_id: me,
        event: "created",
        meta: {},
        created_at: ts,
      });
      return ticket;
    }
    const sb = getSupabaseBrowserClient();
    const { data: firstStage } = await sb
      .from("task_stages")
      .select("id")
      .order("position")
      .limit(1)
      .maybeSingle();
    // Resolve the kanban placement: use the provided board/column or fall back
    // to the company's default board and its first column.
    let boardId = input.board_id ?? null;
    let columnId = input.column_id ?? null;
    if (!columnId) {
      const { data: board } = await sb
        .from("task_boards")
        .select("id")
        .order("is_default", { ascending: false })
        .order("position")
        .limit(1)
        .maybeSingle();
      boardId = boardId ?? (board as { id: string } | null)?.id ?? null;
      if (boardId) {
        const { data: col } = await sb
          .from("task_columns")
          .select("id")
          .eq("board_id", boardId)
          .order("position")
          .limit(1)
          .maybeSingle();
        columnId = (col as { id: string } | null)?.id ?? null;
      }
    }
    const { data, error } = await sb
      .from("tickets")
      .insert({
        company_id: getCurrentCompanyId(),
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        category: input.category ?? "internal",
        subject_type: input.subject_type,
        customer_id: input.customer_id ?? null,
        carrier_id: input.carrier_id ?? null,
        product_id: input.product_id ?? null,
        contract_id: input.contract_id ?? null,
        quote_id: input.quote_id ?? null,
        board_id: boardId,
        column_id: columnId,
        assignee_id: input.assignee_id ?? null,
        created_by: me || null,
        participant_ids: input.participant_ids ?? [],
        tags: input.tags ?? [],
        due_at: input.due_at ?? null,
        stage_id: (firstStage as { id: string } | null)?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    await sb.from("ticket_logs").insert({
      ticket_id: (data as Ticket).id,
      company_id: getCurrentCompanyId(),
      actor_id: getCurrentUserId(),
      event: "created",
      meta: {},
    });
    return data as Ticket;
  },

  async update(
    id: string,
    patch: Partial<
      Pick<
        Ticket,
        | "title"
        | "description"
        | "priority"
        | "category"
        | "subject_type"
        | "customer_id"
        | "carrier_id"
        | "product_id"
        | "contract_id"
        | "quote_id"
        | "assignee_id"
        | "tags"
        | "due_at"
        | "participant_ids"
        | "board_id"
        | "column_id"
      >
    >,
  ): Promise<Ticket> {
    if (env.useMocks) {
      await sleep(360);
      const t = tickets.find((x) => x.id === id);
      if (!t) throw new Error("Tarefa não encontrada");
      Object.assign(t, patch, { updated_at: new Date().toISOString() });
      return t;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("tickets").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as Ticket;
  },

  /** Soft delete — moves the ticket to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(300);
      const idx = tickets.findIndex((t) => t.id === id);
      if (idx !== -1) tickets.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("tickets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
