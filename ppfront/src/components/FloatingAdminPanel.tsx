import { useState } from "react";
import type { RoomState } from "../types";
import { AdminControls } from "./AdminControls";
import { ShareButton } from "./ShareButton";
import { TicketForm } from "./TicketForm";

interface FloatingAdminPanelProps {
  roomId: string;
  roomState: RoomState;
  hasPrevTicket: boolean;
  hasNextTicket: boolean;
  onReveal: () => void;
  onReset: () => void;
  onPrevTicket: () => void;
  onNextTicket: () => void;
  onAddTicket: (content: string) => Promise<void>;
}

export function FloatingAdminPanel({
  roomId,
  roomState,
  hasPrevTicket,
  hasNextTicket,
  onReveal,
  onReset,
  onPrevTicket,
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
            hasPrevTicket={hasPrevTicket}
            hasNextTicket={hasNextTicket}
            onReveal={onReveal}
            onReset={onReset}
            onPrevTicket={onPrevTicket}
            onNextTicket={onNextTicket}
          />
          <TicketForm onAdd={onAddTicket} />
        </div>
      )}
    </div>
  );
}
