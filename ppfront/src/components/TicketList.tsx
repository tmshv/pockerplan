import type { TicketSnapshot } from "../types";

interface TicketListProps {
  tickets: TicketSnapshot[];
  currentTicketId: string;
  isAdmin: boolean;
  onSelectTicket?: (ticketId: string) => void;
}

function truncate(text: string, maxLength: number): string {
  const firstLine = text.split("\n")[0];
  if (firstLine.length <= maxLength) return firstLine;
  return `${firstLine.slice(0, maxLength)}...`;
}

export function TicketList({
  tickets,
  currentTicketId,
  isAdmin,
  onSelectTicket,
}: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="ticket-list empty">
        <h3>Tickets</h3>
        <p>No tickets yet</p>
      </div>
    );
  }

  return (
    <div className="ticket-list">
      <h3>Tickets</h3>
      <ul>
        {tickets.map((ticket, index) => {
          const isCurrent = ticket.id === currentTicketId;
          const clickable = isAdmin && !isCurrent && !!onSelectTicket;
          return (
            <li
              key={ticket.id}
              className={`ticket-list-item${isCurrent ? " current" : ""}${clickable ? " clickable" : ""}`}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onSelectTicket(ticket.id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        onSelectTicket(ticket.id);
                      }
                    }
                  : undefined
              }
            >
              <span className="ticket-list-index">{index + 1}</span>
              <span className="ticket-list-content">
                {truncate(ticket.content, 50) || "Untitled"}
              </span>
              <span className={`ticket-list-badge status-${ticket.status}`}>
                {ticket.status}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
