import { createContext, useContext } from "react";
import { useRoom } from "../hooks/useRoom";
import type { UseRoomResult } from "../hooks/useRoom";

const RoomContext = createContext<UseRoomResult | null>(null);

interface RoomProviderProps {
  roomId: string | undefined;
  children: React.ReactNode;
}

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  const value = useRoom(roomId);
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoomContext(): UseRoomResult {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("useRoomContext must be used within a RoomProvider");
  }
  return ctx;
}
