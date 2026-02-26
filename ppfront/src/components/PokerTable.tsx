import { useEffect, useMemo, useRef, useState } from "react";
import { avatars } from "../data/avatars";
import { hashString, makeRng } from "../lib/random";
import type { User, VoteInfo } from "../types";

interface PokerTableProps {
  roomId: string;
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

const SIZE = 400;
const cx = SIZE / 2;
const cy = SIZE / 2;
const playerRadius = 140;
const treeCount = 9;
const treeMinRadius = 160;
const treeMaxRadius = 190;

export function PokerTable({
  roomId,
  users,
  votes,
  revealed: _revealed,
  currentUserId,
  onPositionsChange,
  onInteract,
}: PokerTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragSourceRef = useRef<string | null>(null);

  const trees = useMemo(() => {
    const rng = makeRng(hashString(roomId));
    return Array.from({ length: treeCount }, (_, i) => {
      const baseAngle = (i / treeCount) * 2 * Math.PI;
      const angleJitter = (rng() - 0.5) * (2 * Math.PI / treeCount) * 0.8;
      const angle = baseAngle + angleJitter;
      const r = treeMinRadius + rng() * (treeMaxRadius - treeMinRadius);
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        size: 1.2 + rng() * 0.6,
      };
    });
  }, [roomId]);

  const [burnedTrees, setBurnedTrees] = useState<Set<number>>(new Set());
  const [flyingTrees, setFlyingTrees] = useState<
    { id: string; fromX: number; fromY: number; dx: number; dy: number }[]
  >([]);
  const flyIdRef = useRef(0);
  const [fireLevel, setFireLevel] = useState(0);

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
      {/* Trees */}
      {trees.map((t, i) => {
        if (burnedTrees.has(i)) return null;
        return (
          <span
            key={i}
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
              e.dataTransfer.setData("tree-index", String(i));
            }}
          >
            🌲
          </span>
        );
      })}

      {/* Flying trees (parabola toward campfire) */}
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
          const idx = parseInt(e.dataTransfer.getData("tree-index"), 10);
          if (!isNaN(idx) && !burnedTrees.has(idx)) {
            const t = trees[idx];
            setBurnedTrees((prev) => new Set(prev).add(idx));
            setFlyingTrees((prev) => [
              ...prev,
              {
                id: `fly-${flyIdRef.current++}`,
                fromX: t.x,
                fromY: t.y,
                dx: cx - t.x,
                dy: cy - t.y,
              },
            ]);
            setFireLevel((lvl) => Math.min(lvl + 1, 5));
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
