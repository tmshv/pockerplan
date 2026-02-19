import type { RoomState } from "../types";

interface AdminControlsProps {
  roomState: RoomState;
  hasTickets: boolean;
  onReveal: () => void;
  onReset: () => void;
  onNextTicket: () => void;
}

export function AdminControls({
  roomState,
  hasTickets,
  onReveal,
  onReset,
  onNextTicket,
}: AdminControlsProps) {
  return (
    <div className="admin-controls">
      <h3>Admin Controls</h3>
      <div className="admin-buttons">
        <button
          type="button"
          onClick={onReveal}
          disabled={roomState !== "voting"}
        >
          Reveal Votes
        </button>
        <button type="button" onClick={onReset} disabled={roomState === "idle"}>
          Reset Votes
        </button>
        <button type="button" onClick={onNextTicket} disabled={!hasTickets}>
          Next Ticket
        </button>
      </div>
    </div>
  );
}
