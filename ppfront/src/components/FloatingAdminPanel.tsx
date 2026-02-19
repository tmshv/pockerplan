import { useState } from "react";
import type { RoomState } from "../types";
import { AdminControls } from "./AdminControls";
import { ShareButton } from "./ShareButton";
import { TicketForm } from "./TicketForm";

interface FloatingAdminPanelProps {
  roomId: string;
  roomState: RoomState;
  hasTickets: boolean;
  onReveal: () => void;
  onReset: () => void;
  onNextTicket: () => void;
  onAddTicket: (content: string) => Promise<void>;
}

export function FloatingAdminPanel({
  roomId,
  roomState,
  hasTickets,
  onReveal,
  onReset,
  onNextTicket,
  onAddTicket,
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
            hasTickets={hasTickets}
            onReveal={onReveal}
            onReset={onReset}
            onNextTicket={onNextTicket}
          />
          <TicketForm onAdd={onAddTicket} />
        </div>
      )}
    </div>
  );
}
