import { TicketConversation } from "@/modules/tickets/ticket-conversation";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="h-[calc(100vh-4rem)]">
      <TicketConversation id={id} />
    </div>
  );
}
