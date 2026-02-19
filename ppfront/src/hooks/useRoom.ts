import { useState, useEffect, useCallback, useRef } from "react";
import { getCentrifuge } from "../api/centrifuge";
import { loadRoomInfo } from "./useUser";
import type {
  RoomSnapshot,
  SubmitVoteRequest,
  AddTicketRequest,
  AddTicketResponse,
  AdminActionRequest,
} from "../types";
import type { Subscription } from "centrifuge";

export interface UseRoomResult {
  roomState: RoomSnapshot | null;
  connected: boolean;
  error: string | null;
  submitVote: (value: string) => Promise<void>;
  addTicket: (title: string, description: string) => Promise<string>;
  revealVotes: () => Promise<void>;
  resetVotes: () => Promise<void>;
  nextTicket: () => Promise<void>;
}

export function useRoom(roomId: string | undefined): UseRoomResult {
  const [roomState, setRoomState] = useState<RoomSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const client = getCentrifuge();
    const channel = `room:${roomId}`;
    const sub = client.newSubscription(channel);

    sub.on("publication", (ctx) => {
      const snapshot = ctx.data as RoomSnapshot;
      setRoomState(snapshot);
    });

    sub.on("subscribed", () => {
      setConnected(true);
      setError(null);
    });

    sub.on("unsubscribed", () => {
      setConnected(false);
    });

    sub.on("error", (ctx) => {
      setError(ctx.error?.message ?? "Subscription error");
    });

    sub.subscribe();
    subRef.current = sub;

    return () => {
      sub.unsubscribe();
      sub.removeAllListeners();
      client.removeSubscription(sub);
      subRef.current = null;
      setConnected(false);
    };
  }, [roomId]);

  const submitVote = useCallback(
    async (value: string) => {
      if (!roomId) return;
      const info = loadRoomInfo(roomId);
      if (!info) throw new Error("Not joined");
      const client = getCentrifuge();
      const req: SubmitVoteRequest = {
        roomId,
        userId: info.userId,
        value,
      };
      await client.rpc("submit_vote", req);
    },
    [roomId]
  );

  const addTicket = useCallback(
    async (title: string, description: string): Promise<string> => {
      if (!roomId) throw new Error("No room");
      const info = loadRoomInfo(roomId);
      if (!info?.adminSecret) throw new Error("Not admin");
      const client = getCentrifuge();
      const req: AddTicketRequest = {
        roomId,
        adminSecret: info.adminSecret,
        title,
        description,
      };
      const result = await client.rpc("add_ticket", req);
      const resp = result.data as unknown as AddTicketResponse;
      return resp.ticketId;
    },
    [roomId]
  );

  const adminAction = useCallback(
    async (method: string) => {
      if (!roomId) return;
      const info = loadRoomInfo(roomId);
      if (!info?.adminSecret) throw new Error("Not admin");
      const client = getCentrifuge();
      const req: AdminActionRequest = {
        roomId,
        adminSecret: info.adminSecret,
      };
      await client.rpc(method, req);
    },
    [roomId]
  );

  const revealVotes = useCallback(() => adminAction("reveal_votes"), [adminAction]);
  const resetVotes = useCallback(() => adminAction("reset_votes"), [adminAction]);
  const nextTicket = useCallback(() => adminAction("next_ticket"), [adminAction]);

  return {
    roomState,
    connected,
    error,
    submitVote,
    addTicket,
    revealVotes,
    resetVotes,
    nextTicket,
  };
}
