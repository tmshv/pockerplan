import type { Subscription } from "centrifuge";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCentrifuge } from "../api/centrifuge";
import type {
  AddTicketRequest,
  AddTicketResponse,
  AdminActionRequest,
  JoinRoomResponse,
  RemoveVoteRequest,
  RoomSnapshot,
  SetTicketRequest,
  SubmitVoteRequest,
  UpdateRoomNameRequest,
} from "../types";
import { loadRoomInfo, loadUser } from "./useUser";

export type RoomErrorType =
  | "not_found"
  | "connection_lost"
  | "timeout"
  | "unknown";

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
  removeVote: () => Promise<void>;
  addTicket: (content: string) => Promise<string>;
  updateRoomName: (name: string) => Promise<void>;
  revealVotes: () => Promise<void>;
  resetVotes: () => Promise<void>;
  startReveal: () => Promise<void>;
  nextTicket: () => Promise<void>;
  prevTicket: () => Promise<void>;
  setTicket: (ticketId: string) => Promise<void>;
  startFreeVote: () => Promise<void>;
  setThinking: (active: boolean) => Promise<void>;
  interactPlayer: (action: string, targetUserId: string) => Promise<void>;
}

function classifyError(
  errMessage: string | undefined,
  code?: number,
): RoomError {
  const msg = errMessage ?? "Unknown error";
  if (
    code === 403 ||
    code === 404 ||
    msg.includes("not found") ||
    msg.includes("permission denied")
  ) {
    return {
      type: "not_found",
      message: "Room not found. It may have expired or the link is invalid.",
    };
  }
  if (
    msg.includes("disconnect") ||
    msg.includes("transport") ||
    msg.includes("timeout")
  ) {
    return {
      type: "connection_lost",
      message: "Connection lost. Trying to reconnect...",
    };
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
    let subscribed = false;

    const timeoutId = setTimeout(() => {
      if (!subscribed) {
        setError({
          type: "timeout",
          message: "Connection timed out. The server may be unreachable.",
        });
      }
    }, 10_000);

    sub.on("publication", (ctx) => {
      const snapshot = ctx.data as RoomSnapshot;
      setRoomState(snapshot);
    });

    sub.on("subscribed", () => {
      subscribed = true;
      clearTimeout(timeoutId);
      setConnected(true);
      setError(null);
      // Issue join_room RPC to get initial state and register the client mapping.
      // This runs on first subscribe and on reconnect.
      const info = loadRoomInfo(roomId);
      const userPrefs = loadUser();
      if (info?.userId && userPrefs) {
        client
          .rpc("join_room", {
            roomId,
            userName: userPrefs.name,
            avatarId: userPrefs.avatarId,
            userId: info.userId,
          })
          .then((result) => {
            const resp = result.data as unknown as JoinRoomResponse;
            if (resp.state) {
              setRoomState(resp.state);
            }
          })
          .catch(() => {
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

    const onClientDisconnected = () => {
      setConnected(false);
    };
    const onClientConnecting = () => {
      setConnected(false);
    };
    const onClientConnected = () => {
      setError((prev) =>
        prev?.type === "connection_lost" || prev?.type === "timeout"
          ? null
          : prev,
      );
    };

    client.on("disconnected", onClientDisconnected);
    client.on("connecting", onClientConnecting);
    client.on("connected", onClientConnected);

    sub.subscribe();
    subRef.current = sub;

    return () => {
      clearTimeout(timeoutId);
      client.off("disconnected", onClientDisconnected);
      client.off("connecting", onClientConnecting);
      client.off("connected", onClientConnected);
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
    [roomId],
  );

  const removeVote = useCallback(async () => {
    if (!roomId) return;
    const info = loadRoomInfo(roomId);
    if (!info) throw new Error("Not joined");
    const client = getCentrifuge();
    const req: RemoveVoteRequest = { roomId, userId: info.userId };
    await client.rpc("remove_vote", req);
  }, [roomId]);

  const addTicket = useCallback(
    async (content: string): Promise<string> => {
      if (!roomId) throw new Error("No room");
      const info = loadRoomInfo(roomId);
      if (!info?.adminSecret) throw new Error("Not admin");
      const client = getCentrifuge();
      const req: AddTicketRequest = {
        roomId,
        adminSecret: info.adminSecret,
        content,
      };
      const result = await client.rpc("add_ticket", req);
      const resp = result.data as unknown as AddTicketResponse;
      return resp.ticketId;
    },
    [roomId],
  );

  const updateRoomName = useCallback(
    async (name: string) => {
      if (!roomId) return;
      const info = loadRoomInfo(roomId);
      if (!info?.adminSecret) throw new Error("Not admin");
      const client = getCentrifuge();
      const req: UpdateRoomNameRequest = {
        roomId,
        adminSecret: info.adminSecret,
        name,
      };
      await client.rpc("update_room_name", req);
    },
    [roomId],
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
    [roomId],
  );

  const revealVotes = useCallback(
    () => adminAction("reveal_votes"),
    [adminAction],
  );
  const resetVotes = useCallback(
    () => adminAction("reset_votes"),
    [adminAction],
  );
  const startReveal = useCallback(
    () => adminAction("start_reveal"),
    [adminAction],
  );
  const nextTicket = useCallback(
    () => adminAction("next_ticket"),
    [adminAction],
  );
  const prevTicket = useCallback(
    () => adminAction("prev_ticket"),
    [adminAction],
  );
  const startFreeVote = useCallback(
    () => adminAction("start_free_vote"),
    [adminAction],
  );
  const setTicket = useCallback(
    async (ticketId: string) => {
      if (!roomId) return;
      const info = loadRoomInfo(roomId);
      if (!info?.adminSecret) throw new Error("Not admin");
      const client = getCentrifuge();
      const req: SetTicketRequest = {
        roomId,
        adminSecret: info.adminSecret,
        ticketId,
      };
      await client.rpc("set_ticket", req);
    },
    [roomId],
  );

  const setThinking = useCallback(
    async (active: boolean) => {
      if (!roomId) return;
      const info = loadRoomInfo(roomId);
      if (!info?.userId) return;
      const client = getCentrifuge();
      await client.rpc("set_thinking", {
        roomId,
        userId: info.userId,
        thinking: active,
      });
    },
    [roomId],
  );

  const interactPlayer = useCallback(
    async (action: string, targetUserId: string) => {
      if (!roomId) return;
      const info = loadRoomInfo(roomId);
      if (!info?.userId) return;
      const client = getCentrifuge();
      await client.rpc("interact_player", {
        roomId,
        userId: info.userId,
        targetUserId,
        action,
      });
    },
    [roomId],
  );

  return {
    roomState,
    connected,
    error,
    loading,
    submitVote,
    removeVote,
    addTicket,
    updateRoomName,
    revealVotes,
    resetVotes,
    startReveal,
    nextTicket,
    prevTicket,
    setTicket,
    startFreeVote,
    setThinking,
    interactPlayer,
  };
}
