import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { NameInput } from "../components/NameInput";
import { AvatarPicker } from "../components/AvatarPicker";
import { useUserContext } from "../context/UserContext";
import { getCentrifuge } from "../api/centrifuge";
import { loadRoomInfo, saveRoomInfo } from "../hooks/useUser";
import type { JoinRoomResponse } from "../types";

function isRoomNotFound(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("not found") || msg.includes("permission denied");
  }
  return false;
}

export function JoinPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const { user, setUser } = useUserContext();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? "");
  const [error, setError] = useState("");
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim() !== "" && avatarId !== "" && !submitting;

  async function handleJoin() {
    if (!canSubmit || !roomId) return;
    setError("");
    setRoomNotFound(false);
    setSubmitting(true);

    try {
      const client = getCentrifuge();
      const existing = loadRoomInfo(roomId);
      const result = await client.rpc("join_room", {
        roomId,
        userName: name.trim(),
        avatarId,
        userId: existing?.userId,
      });
      const resp = result.data as unknown as JoinRoomResponse;

      setUser({ name: name.trim(), avatarId });
      saveRoomInfo(roomId, {
        userId: resp.userId,
        adminSecret: existing?.adminSecret,
      });

      navigate(`/room/${roomId}`);
    } catch (err) {
      if (isRoomNotFound(err)) {
        setRoomNotFound(true);
        setError("This room does not exist. It may have expired.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to join room");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page join-page">
      <h1>Join Room</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleJoin();
        }}
      >
        <NameInput value={name} onChange={setName} />
        <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
        {error && <p className="error">{error}</p>}
        {roomNotFound && (
          <Link to="/" className="error-home-link">Create a New Room</Link>
        )}
        <button type="submit" disabled={!canSubmit}>
          {submitting ? "Joining..." : "Join Room"}
        </button>
      </form>
    </div>
  );
}
