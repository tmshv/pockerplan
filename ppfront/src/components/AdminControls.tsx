import type { RoomState } from "../types";

interface AdminControlsProps {
  roomState: RoomState;
  hasPrevTicket: boolean;
  hasNextTicket: boolean;
  onReveal: () => void;
  onReset: () => void;
  onPrevTicket: () => void;
  onNextTicket: () => void;
}

export function AdminControls({
  roomState,
  hasPrevTicket,
  hasNextTicket,
  onReveal,
  onReset,
  onPrevTicket,
  onNextTicket,
}: AdminControlsProps) {
  return (
    <div className="admin-controls">
      <h3>Admin Controls</h3>
      <div className="admin-buttons">
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
      </div>
    </div>
  );
}
