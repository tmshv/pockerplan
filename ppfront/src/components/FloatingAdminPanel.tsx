import { useState } from "react";
import type { RoomState } from "../types";
import { AdminControls } from "./AdminControls";
import { ShareButton } from "./ShareButton";
import { TicketForm } from "./TicketForm";

interface FloatingAdminPanelProps {
  roomId: string;
  roomState: RoomState;
  ticketsEnabled: boolean;
  hasPrevTicket: boolean;
  hasNextTicket: boolean;
  hasTickets: boolean;
  onReveal: () => void;
  onReset: () => void;
  onPrevTicket: () => void;
  onNextTicket: () => void;
  onAddTicket: (content: string) => Promise<unknown>;
  onStartFreeVote: () => void;
}

export function FloatingAdminPanel({
  roomId,
  roomState,
  ticketsEnabled,
  hasPrevTicket,
  hasNextTicket,
  hasTickets,
  onReveal,
  onReset,
  onPrevTicket,
  onNextTicket,
  onAddTicket,
  onStartFreeVote,
}: FloatingAdminPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`floating-admin-panel ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className="floating-admin-toggle"
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? "Admin" : "Hide"}
      </button>

      {!collapsed && (
        <div className="floating-admin-content">
          <ShareButton roomId={roomId} />
          <AdminControls
            roomState={roomState}
            ticketsEnabled={ticketsEnabled}
            hasPrevTicket={hasPrevTicket}
            hasNextTicket={hasNextTicket}
            hasTickets={hasTickets}
            onReveal={onReveal}
            onReset={onReset}
            onPrevTicket={onPrevTicket}
            onNextTicket={onNextTicket}
            onStartFreeVote={onStartFreeVote}
          />
          {ticketsEnabled && <TicketForm onAdd={onAddTicket} />}
        </div>
      )}
    </div>
  );
}
