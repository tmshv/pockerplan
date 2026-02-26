import { useEffect, useRef, useState } from "react";
import { avatars } from "../data/avatars";
import type { CampfireState, FeedFirePayload, RoomEvent, User, VoteInfo } from "../types";

interface PokerTableProps {
  roomId: string;
  users: User[];
  votes: VoteInfo[];
  revealed: boolean;
  currentUserId: string;
  campfire: CampfireState | null;
  campfireEvents: RoomEvent[];
  onPositionsChange: (positions: Map<string, { x: number; y: number }>) => void;
  onInteract: (action: string, targetUserId: string) => void;
  onFeedFire: (treeId: number, fromX: number, fromY: number) => void;
}

function getAvatarEmoji(avatarId: string): string {
  return avatars.find((a) => a.id === avatarId)?.emoji ?? "🙂";
}

const SIZE = 400;
const cx = SIZE / 2;
const cy = SIZE / 2;
const playerRadius = 140;

export function PokerTable({
  users,
  votes,
  revealed: _revealed,
  currentUserId,
  campfire,
  campfireEvents,
  onPositionsChange,
  onInteract,
  onFeedFire,
}: PokerTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragSourceRef = useRef<string | null>(null);

  const [flyingTrees, setFlyingTrees] = useState<
    { id: string; fromX: number; fromY: number; dx: number; dy: number }[]
  >([]);
  const flyIdRef = useRef(0);

  // Derive campfire data from server state.
  const aliveTrees = (campfire?.trees ?? []).filter((t) => !t.burnedAt);
  const fireLevel = campfire?.fireLevel ?? 0;

  // React to incoming campfire events by enqueueing flying-tree animations.
  useEffect(() => {
    const feedFireEvents = campfireEvents.filter((e) => e.action === "feed_fire");
    if (feedFireEvents.length === 0) return;

    setFlyingTrees((prev) => {
      const next = [...prev];
      for (const ev of feedFireEvents) {
        const payload = ev.payload as FeedFirePayload | undefined;
        if (!payload) continue;
        next.push({
          id: `fly-${flyIdRef.current++}`,
          fromX: payload.fromX,
          fromY: payload.fromY,
          dx: cx - payload.fromX,
          dy: cy - payload.fromY,
        });
      }
      return next;
    });
  // Only re-run when the campfireEvents reference changes (new snapshot).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campfireEvents]);

  const N = users.length;
  const positions = users.map((u, i) => {
    const angle = (i / Math.max(N, 1)) * 2 * Math.PI - Math.PI / 2;
    return {
      user: u,
      x: cx + playerRadius * Math.cos(angle),
      y: cy + playerRadius * Math.sin(angle),
    };
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

  const hasVoted = (userId: string) => votes.some((v) => v.userId === userId);

  function getStatusBadge(user: User) {
    if (hasVoted(user.id)) {
      return <span className="poker-table-badge poker-table-badge--voted">✓</span>;
    }
    if (user.thinking) {
      return <span className="poker-table-badge poker-table-badge--thinking">💭</span>;
    }
    return <span className="poker-table-badge poker-table-badge--empty">🃏</span>;
  }

  return (
    <div
      ref={containerRef}
      className="poker-table-container"
      style={{ width: SIZE, height: SIZE, position: "relative" }}
    >
      {/* Trees (server-authoritative positions) */}
      {aliveTrees.map((t) => (
        <span
          key={t.id}
          draggable
          style={{
            position: "absolute",
            left: t.x,
            top: t.y,
            transform: "translate(-50%, -50%)",
            fontSize: `${t.size}rem`,
            lineHeight: 1,
            cursor: "grab",
            userSelect: "none",
          }}
          onDragStart={(e) => {
            e.dataTransfer.setData("tree-id", String(t.id));
            e.dataTransfer.setData("tree-x", String(t.x));
            e.dataTransfer.setData("tree-y", String(t.y));
          }}
        >
          🌲
        </span>
      ))}

      {/* Flying trees (local animation only) */}
      {flyingTrees.map((ft) => (
        <span
          key={ft.id}
          className="paper-throw"
          style={
            {
              left: ft.fromX,
              top: ft.fromY,
              fontSize: "1.5rem",
              "--dx": `${ft.dx}px`,
              "--dy": `${ft.dy}px`,
            } as React.CSSProperties
          }
          onAnimationEnd={() =>
            setFlyingTrees((prev) => prev.filter((f) => f.id !== ft.id))
          }
        >
          🌲
        </span>
      ))}

      {/* Campfire */}
      <div
        style={{
          position: "absolute",
          left: cx - 50,
          top: cy - 50,
          width: 100,
          height: 100,
          userSelect: "none",
          transform: `scale(${1 + fireLevel * 0.15})`,
          transformOrigin: "center",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const treeId = parseInt(e.dataTransfer.getData("tree-id"), 10);
          const fromX = parseFloat(e.dataTransfer.getData("tree-x"));
          const fromY = parseFloat(e.dataTransfer.getData("tree-y"));
          if (!isNaN(treeId) && !isNaN(fromX) && !isNaN(fromY)) {
            onFeedFire(treeId, fromX, fromY);
          }
        }}
      >
        <span className="campfire-glow" />
        <span className="campfire-flame campfire-flame--large">🔥</span>
      </div>

      {/* Players */}
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
              <span style={{ position: "absolute", bottom: -4, right: -4 }}>
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
