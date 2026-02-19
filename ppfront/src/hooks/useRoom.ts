import { useState, useEffect, useCallback, useRef } from "react";
import { getCentrifuge } from "../api/centrifuge";
import { loadRoomInfo, loadUser } from "./useUser";
import type {
  RoomSnapshot,
  JoinRoomResponse,
  SubmitVoteRequest,
  AddTicketRequest,
  AddTicketResponse,
  AdminActionRequest,
} from "../types";
import type { Subscription } from "centrifuge";

export type RoomErrorType = "not_found" | "connection_lost" | "unknown";

export interface RoomError {
  type: RoomErrorType;
  message: string;
}

export interface UseRoomResult {
  roomState: RoomSnapshot | null;
  connected: boolean;
  error: RoomError | null;
  loading: boolean;
  submitVote: (value: string) => Promise<void>;
  addTicket: (title: string, description: string) => Promise<string>;
  revealVotes: () => Promise<void>;
  resetVotes: () => Promise<void>;
  nextTicket: () => Promise<void>;
}

function classifyError(errMessage: string | undefined, code?: number): RoomError {
  const msg = errMessage ?? "Unknown error";
  if (code === 403 || code === 404 || msg.includes("not found") || msg.includes("permission denied")) {
    return { type: "not_found", message: "Room not found. It may have expired or the link is invalid." };
  }
  if (msg.includes("disconnect") || msg.includes("transport") || msg.includes("timeout")) {
    return { type: "connection_lost", message: "Connection lost. Trying to reconnect..." };
  }
  return { type: "unknown", message: msg };
}

export function useRoom(roomId: string | undefined): UseRoomResult {
  const [roomState, setRoomState] = useState<RoomSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<RoomError | null>(null);
  const subRef = useRef<Subscription | null>(null);

  const loading = !!roomId && !roomState && !error;

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
      // Issue join_room RPC to get initial state and register the client mapping.
      // This runs on first subscribe and on reconnect.
      const info = loadRoomInfo(roomId);
      const userPrefs = loadUser();
      if (info?.userId && userPrefs) {
        client.rpc("join_room", {
          roomId,
          userName: userPrefs.name,
          avatarId: userPrefs.avatarId,
          userId: info.userId,
        }).then((result) => {
          const resp = result.data as unknown as JoinRoomResponse;
          if (resp.state) {
            setRoomState(resp.state);
          }
        }).catch(() => {
          // broadcast will deliver state; non-critical if this fails
        });
      }
    });

    sub.on("unsubscribed", (ctx) => {
      setConnected(false);
      if (ctx.code !== 0 && ctx.code !== 3000) {
        setError(classifyError(ctx.reason, ctx.code));
      }
    });

    sub.on("error", (ctx) => {
      const err = classifyError(ctx.error?.message, ctx.error?.code);
      setError(err);
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
    loading,
    submitVote,
    addTicket,
    revealVotes,
    resetVotes,
    nextTicket,
  };
}
