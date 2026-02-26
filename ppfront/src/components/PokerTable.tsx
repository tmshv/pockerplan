import { useEffect, useRef } from "react";
import { avatars } from "../data/avatars";
import type { User, VoteInfo } from "../types";

interface PokerTableProps {
  users: User[];
  votes: VoteInfo[];
  revealed: boolean;
  currentUserId: string;
  onPositionsChange: (positions: Map<string, { x: number; y: number }>) => void;
  onInteract: (action: string, targetUserId: string) => void;
}

function getAvatarEmoji(avatarId: string): string {
  return avatars.find((a) => a.id === avatarId)?.emoji ?? "🙂";
}

export function PokerTable({
  users,
  votes,
  revealed: _revealed,
  currentUserId,
  onPositionsChange,
  onInteract,
}: PokerTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragSourceRef = useRef<string | null>(null);

  const cx = 300;
  const cy = 160;
  const rx = 220;
  const ry = 110;

  const N = users.length;

  const positions = users.map((u, i) => {
    const angle = (i / Math.max(N, 1)) * 2 * Math.PI - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return { user: u, x, y };
  });

  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    positions.forEach(({ user, x, y }) => {
      map.set(user.id, { x: rect.left + x, y: rect.top + y });
    });
    onPositionsChange(map);
  });

  const hasVoted = (userId: string) =>
    votes.some((v) => v.userId === userId);

  function getStatusBadge(user: User) {
    if (user.thinking) {
      return <span className="poker-table-badge poker-table-badge--thinking">💭</span>;
    }
    if (hasVoted(user.id)) {
      return <span className="poker-table-badge poker-table-badge--voted">✓</span>;
    }
    return <span className="poker-table-badge poker-table-badge--empty">🃏</span>;
  }

  return (
    <div
      ref={containerRef}
      className="poker-table-container"
      style={{ width: 600, height: 320, position: "relative" }}
    >
      <div
        className="poker-table-oval"
        style={{
          position: "absolute",
          left: cx - rx,
          top: cy - ry,
          width: rx * 2,
          height: ry * 2,
          borderRadius: "50%",
          background: "var(--poker-table-color, #2d6a4f)",
          border: "4px solid var(--poker-table-border, #1b4332)",
        }}
      />
      {positions.map(({ user, x, y }) => {
        const isSelf = user.id === currentUserId;
        return (
          <div
            key={user.id}
            className={`poker-table-seat${isSelf ? " poker-table-seat--self" : ""}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: isSelf ? "grab" : "default",
              userSelect: "none",
            }}
            draggable={isSelf}
            onDragStart={
              isSelf
                ? (e) => {
                    dragSourceRef.current = user.id;
                    e.dataTransfer.effectAllowed = "move";
                  }
                : undefined
            }
            onDragEnd={
              isSelf
                ? () => {
                    dragSourceRef.current = null;
                  }
                : undefined
            }
            onDragOver={
              !isSelf
                ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }
                : undefined
            }
            onDrop={
              !isSelf
                ? (e) => {
                    e.preventDefault();
                    if (dragSourceRef.current && dragSourceRef.current !== user.id) {
                      onInteract("paper_throw", user.id);
                    }
                    dragSourceRef.current = null;
                  }
                : undefined
            }
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>
                {getAvatarEmoji(user.avatarId)}
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                }}
              >
                {getStatusBadge(user)}
              </span>
            </div>
            <span
              className="poker-table-name"
              style={{
                fontSize: "0.65rem",
                maxWidth: 64,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
                opacity: user.connected ? 1 : 0.4,
              }}
            >
              {user.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
