import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { RoomProvider, useRoomContext } from "../context/RoomContext";
import { loadRoomInfo, saveRoomInfo } from "../hooks/useUser";
import { VotingPanel } from "../components/VotingPanel";
import { UserList } from "../components/UserList";
import { TicketPanel } from "../components/TicketPanel";
import { VoteResults } from "../components/VoteResults";
import { AdminControls } from "../components/AdminControls";
import { TicketForm } from "../components/TicketForm";

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Persist admin secret from URL to localStorage
  useEffect(() => {
    if (!id) return;
    const adminSecret = searchParams.get("admin");
    if (adminSecret) {
      const existing = loadRoomInfo(id);
      if (existing) {
        saveRoomInfo(id, { ...existing, adminSecret });
      }
    }
  }, [id, searchParams]);

  // Redirect to join if not joined yet
  useEffect(() => {
    if (!id) return;
    const info = loadRoomInfo(id);
    if (!info) {
      navigate(`/room/${id}/join`, { replace: true });
    }
  }, [id, navigate]);

  const info = id ? loadRoomInfo(id) : null;
  if (!info) return null;

  return (
    <RoomProvider roomId={id}>
      <RoomPageContent roomId={id!} />
    </RoomProvider>
  );
}

function RoomPageContent({ roomId }: { roomId: string }) {
  const { roomState, connected, error, submitVote, addTicket, revealVotes, resetVotes, nextTicket } =
    useRoomContext();

  const info = loadRoomInfo(roomId);
  const isAdmin = !!info?.adminSecret;
  const userId = info?.userId ?? "";

  if (error) {
    return (
      <div className="page room-page">
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="page room-page">
        <p>{connected ? "Loading room..." : "Connecting..."}</p>
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
        <h1>Room</h1>
        {!connected && <span className="connection-status">Reconnecting...</span>}
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
