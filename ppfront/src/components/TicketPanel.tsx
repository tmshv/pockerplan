import Markdown from "react-markdown";
import type { TicketSnapshot } from "../types";

interface TicketPanelProps {
  ticket: TicketSnapshot | null;
}

export function TicketPanel({ ticket }: TicketPanelProps) {
  if (!ticket) {
    return (
      <div className="ticket-panel empty">
        <p>No ticket selected. Admin needs to add a ticket to start voting.</p>
      </div>
    );
  }

  return (
    <div className="ticket-panel">
      <h2>{ticket.title}</h2>
      {ticket.description && (
        <div className="ticket-description">
          <Markdown>{ticket.description}</Markdown>
        </div>
      )}
      <span className={`ticket-status status-${ticket.status}`}>{ticket.status}</span>
    </div>
  );
}
