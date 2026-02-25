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

  if (!ticket.content) {
    return (
      <div className="ticket-panel free-vote">
        <span className={`ticket-status status-${ticket.status}`}>
          {ticket.status}
        </span>
      </div>
    );
  }

  return (
    <div className="ticket-panel">
      <div className="ticket-description">
        <Markdown>{ticket.content}</Markdown>
      </div>
      <span className={`ticket-status status-${ticket.status}`}>
        {ticket.status}
      </span>
    </div>
  );
}
