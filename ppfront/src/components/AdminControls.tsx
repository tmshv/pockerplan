import type { RoomState } from "../types";

interface AdminControlsProps {
  roomState: RoomState;
  ticketsEnabled: boolean;
  hasPrevTicket: boolean;
  hasNextTicket: boolean;
  hasTickets: boolean;
  onReveal: () => void;
  onReset: () => void;
  onPrevTicket: () => void;
  onNextTicket: () => void;
  onStartFreeVote: () => void;
}

export function AdminControls({
  roomState,
  ticketsEnabled,
  hasPrevTicket,
  hasNextTicket,
  hasTickets,
  onReveal,
  onReset,
  onPrevTicket,
  onNextTicket,
  onStartFreeVote,
}: AdminControlsProps) {
  return (
    <div className="admin-controls">
      <h3>Admin Controls</h3>
      <div className="admin-buttons">
        {(roomState === "idle" || roomState === "revealed") && !hasTickets && (
          <button type="button" onClick={onStartFreeVote}>
            Start Voting
          </button>
        )}
        <button
          type="button"
          onClick={onReveal}
          disabled={roomState !== "voting" && roomState !== "counting_down"}
        >
          Reveal Votes
        </button>
        <button type="button" onClick={onReset} disabled={roomState === "idle"}>
          Reset Votes
        </button>
        {ticketsEnabled && (
          <div className="ticket-nav-buttons">
            <button
              type="button"
              onClick={onPrevTicket}
              disabled={!hasPrevTicket}
            >
              Prev Ticket
            </button>
            <button
              type="button"
              onClick={onNextTicket}
              disabled={!hasNextTicket}
            >
              Next Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
