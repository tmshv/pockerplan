import { useEffect, useRef, useState } from "react";
import type { RoomEvent } from "../types";

interface ActiveThrow {
  id: string;
  fromX: number;
  fromY: number;
  dx: number;
  dy: number;
}

interface PlayerInteractionLayerProps {
  events: RoomEvent[];
  userPositions: Map<string, { x: number; y: number }>;
}

export function PlayerInteractionLayer({
  events,
  userPositions,
}: PlayerInteractionLayerProps) {
  const [activeThrows, setActiveThrows] = useState<ActiveThrow[]>([]);
  const throwIdRef = useRef(0);

  useEffect(() => {
    if (!events || events.length === 0) return;
    const paperThrows = events.filter(
      (e) => e.type === "player_interaction" && e.action === "paper_throw",
    );
    if (paperThrows.length === 0) return;

    const newThrows: ActiveThrow[] = [];
    for (const ev of paperThrows) {
      const from = userPositions.get(ev.fromId);
      const to = userPositions.get(ev.toId);
      if (!from || !to) continue;
      newThrows.push({
        id: `throw-${throwIdRef.current++}`,
        fromX: from.x,
        fromY: from.y,
        dx: to.x - from.x,
        dy: to.y - from.y,
      });
    }

    if (newThrows.length > 0) {
      setActiveThrows((prev) => [...prev, ...newThrows]);
    }
  }, [events, userPositions]);

  const handleAnimationEnd = (id: string) => {
    setActiveThrows((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="player-interaction-layer">
      {activeThrows.map((t) => (
        <span
          key={t.id}
          className="paper-throw"
          style={
            {
              left: t.fromX,
              top: t.fromY,
              "--dx": `${t.dx}px`,
              "--dy": `${t.dy}px`,
            } as React.CSSProperties
          }
          onAnimationEnd={() => handleAnimationEnd(t.id)}
        >
          📝
        </span>
      ))}
    </div>
  );
}
