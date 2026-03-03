import type { RoomSnapshot } from "../types";

export function isRoomSnapshot(value: unknown): value is RoomSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    Array.isArray(v.users) &&
    typeof v.state === "string"
  );
}
