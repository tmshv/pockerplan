import { useEffect } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { AdminControls } from "../components/AdminControls";
import { RoomNameEditor } from "../components/RoomNameEditor";
import { TicketForm } from "../components/TicketForm";
import { TicketPanel } from "../components/TicketPanel";
import { UserList } from "../components/UserList";
import { VoteResults } from "../components/VoteResults";
import { VotingPanel } from "../components/VotingPanel";
import { RoomProvider, useRoomContext } from "../context/RoomContext";
import { loadRoomInfo, saveRoomInfo } from "../hooks/useUser";

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Persist admin secret from URL and redirect to join if not joined yet.
  // These must be atomic: save the secret before checking join status.
  useEffect(() => {
    if (!id) return;
    const adminSecret = searchParams.get("admin");
    if (adminSecret) {
      const existing = loadRoomInfo(id);
      saveRoomInfo(id, { userId: existing?.userId ?? "", adminSecret });
    }
    const info = loadRoomInfo(id);
    if (!info?.userId) {
      navigate(`/room/${id}/join`, { replace: true });
    }
  }, [id, searchParams, navigate]);

  const info = id ? loadRoomInfo(id) : null;
  if (!info) return null;

  return (
    <RoomProvider roomId={id}>
      <RoomPageContent roomId={id!} />
    </RoomProvider>
  );
}

function RoomPageContent({ roomId }: { roomId: string }) {
  const {
    roomState,
    connected,
    error,
    loading,
    submitVote,
    addTicket,
    updateRoomName,
    revealVotes,
    resetVotes,
    nextTicket,
  } = useRoomContext();

  const info = loadRoomInfo(roomId);
  const isAdmin = !!info?.adminSecret;
  const userId = info?.userId ?? "";

  if (error) {
    return (
      <div className="page room-page">
        <div className="error-state">
          {error.type === "not_found" && (
            <>
              <h2>Room Not Found</h2>
              <p>{error.message}</p>
              <Link to="/" className="error-home-link">
                Create a New Room
              </Link>
            </>
          )}
          {error.type === "connection_lost" && (
            <>
              <h2>Connection Lost</h2>
              <p>{error.message}</p>
              <div className="loading-spinner" />
            </>
          )}
          {error.type === "timeout" && (
            <>
              <h2>Connection Timed Out</h2>
              <p>{error.message}</p>
              <button
                type="button"
                className="error-home-link"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </>
          )}
          {error.type === "unknown" && (
            <>
              <h2>Something Went Wrong</h2>
              <p>{error.message}</p>
              <Link to="/" className="error-home-link">
                Go Home
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading || !roomState) {
    return (
      <div className="page room-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>{connected ? "Loading room..." : "Connecting..."}</p>
        </div>
      </div>
    );
  }

  const currentTicket =
    roomState.tickets.find((t) => t.id === roomState.currentTicketId) ?? null;

  const myVote = currentTicket?.votes.find((v) => v.userId === userId);
  const isRevealed = roomState.state === "revealed";
  const isVoting = roomState.state === "voting";

  return (
    <div className="page room-page">
      <div className="room-header">
        <RoomNameEditor
          name={roomState.name}
          isAdmin={isAdmin}
          onSave={updateRoomName}
        />
        {!connected && (
          <span className="connection-status">Reconnecting...</span>
        )}
      </div>

      <div className="room-layout">
        <div className="room-main">
          <TicketPanel ticket={currentTicket} />

          {isVoting && (
            <VotingPanel
              scaleId={roomState.scale}
              selectedValue={myVote?.value ?? null}
              disabled={false}
              onVote={submitVote}
            />
          )}

          {isRevealed && currentTicket && (
            <VoteResults votes={currentTicket.votes} users={roomState.users} />
          )}

          {isAdmin && (
            <>
              <AdminControls
                roomState={roomState.state}
                hasTickets={roomState.tickets.length > 0}
                onReveal={revealVotes}
                onReset={resetVotes}
                onNextTicket={nextTicket}
              />
              <TicketForm
                onAdd={async (title, description) => {
                  await addTicket(title, description);
                }}
              />
            </>
          )}
        </div>

        <div className="room-sidebar">
          <UserList
            users={roomState.users}
            votes={currentTicket?.votes ?? []}
            revealed={isRevealed}
          />
        </div>
      </div>
    </div>
  );
}
