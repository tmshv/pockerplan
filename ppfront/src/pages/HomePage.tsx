import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCentrifuge } from "../api/centrifuge";
import { AvatarPicker } from "../components/AvatarPicker";
import { NameInput } from "../components/NameInput";
import { ScalePicker } from "../components/ScalePicker";
import { ThemeToggle } from "../components/ThemeToggle";
import { useUserContext } from "../context/UserContext";
import { saveRoomInfo } from "../hooks/useUser";
import type { CreateRoomResponse } from "../types";

export function HomePage() {
  const { user, setUser } = useUserContext();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? "");
  const [scaleId, setScaleId] = useState("fibonacci");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim() !== "" && avatarId !== "" && !submitting;

  async function handleCreate() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);

    try {
      const client = getCentrifuge();
      const result = await client.rpc("create_room", {
        scaleId,
        userName: name.trim(),
        avatarId,
      });
      const resp = result.data as unknown as CreateRoomResponse;

      setUser({ name: name.trim(), avatarId });
      saveRoomInfo(resp.roomId, {
        userId: resp.userId,
        adminSecret: resp.adminSecret,
      });

      navigate(`/room/${resp.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page home-page">
      <ThemeToggle />
      <h1>Planning Poker</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <NameInput value={name} onChange={setName} />
        <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
        <ScalePicker selected={scaleId} onSelect={setScaleId} />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={!canSubmit}>
          {submitting ? "Creating..." : "Create Room"}
        </button>
      </form>
    </div>
  );
}
