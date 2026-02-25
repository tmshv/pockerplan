import { useCallback, useEffect, useMemo } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { CountdownOverlay } from "../components/CountdownOverlay";
import { FloatingAdminPanel } from "../components/FloatingAdminPanel";
import { RoomNameEditor } from "../components/RoomNameEditor";
import { ThemeToggle } from "../components/ThemeToggle";
import { TicketList } from "../components/TicketList";
import { TicketPanel } from "../components/TicketPanel";
import { UserList } from "../components/UserList";
import { VoteResults } from "../components/VoteResults";
import { VotingPanel } from "../components/VotingPanel";
import { RoomProvider, useRoomContext } from "../context/RoomContext";
import { scales } from "../data/scales";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
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

  if (!id) return null;
  const info = loadRoomInfo(id);
  if (!info) return null;

  return (
    <RoomProvider roomId={id}>
      <RoomPageContent roomId={id} />
    </RoomProvider>
  );
}

function RoomPageContent({ roomId }: { roomId: string }) {
  const {
    roomState,
    connected,
    error,
    submitVote,
    addTicket,
    updateRoomName,
    revealVotes,
    resetVotes,
    startReveal,
    nextTicket,
    prevTicket,
    setTicket,
    startFreeVote,
  } = useRoomContext();

  const info = loadRoomInfo(roomId);
  const isAdmin = !!info?.adminSecret;
  const userId = info?.userId ?? "";

  const tickets = roomState?.tickets ?? [];
  const users = roomState?.users ?? [];
  const currentTicket =
    tickets.find((t) => t.id === roomState?.currentTicketId) ?? null;

  const myVote = currentTicket?.votes.find((v) => v.userId === userId);
  const isRevealed = roomState?.state === "revealed";
  const isVoting = roomState?.state === "voting";
  const isCountingDown = roomState?.state === "counting_down";

  const currentTicketIndex = roomState?.currentTicketId
    ? tickets.findIndex((t) => t.id === roomState.currentTicketId)
    : -1;
  const hasPrevTicket = currentTicketIndex > 0 && !isCountingDown;
  const hasNextTicket =
    (currentTicketIndex === -1
      ? tickets.length > 0
      : currentTicketIndex < tickets.length - 1) && !isCountingDown;

  const scaleValues = useMemo(() => {
    const scale = scales.find((s) => s.id === roomState?.scale);
    return scale?.values ?? [];
  }, [roomState?.scale]);

  const onCountdownComplete = useCallback(() => {
    if (isAdmin) {
      revealVotes().catch(() => {});
    }
  }, [isAdmin, revealVotes]);

  const handleRevealShortcut = useCallback(() => {
    if (isCountingDown) {
      revealVotes().catch(() => {});
    } else {
      startReveal().catch(() => {});
    }
  }, [isCountingDown, revealVotes, startReveal]);

  const handleResetShortcut = useCallback(() => {
    resetVotes().catch(() => {});
  }, [resetVotes]);

  const handleVoteShortcut = useCallback(
    (value: string) => {
      submitVote(value).catch(() => {});
    },
    [submitVote],
  );

  useKeyboardShortcuts({
    scaleValues,
    roomState: roomState?.state,
    isAdmin,
    onVote: handleVoteShortcut,
    onReveal: handleRevealShortcut,
    onReset: handleResetShortcut,
    onNextTicket: nextTicket,
    onPrevTicket: prevTicket,
    hasPrevTicket,
    hasNextTicket,
  });

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

  return (
    <div className="page room-page">
      <div className="room-header">
        <RoomNameEditor
          name={roomState?.name ?? ""}
          isAdmin={isAdmin}
          onSave={updateRoomName}
        />
        {!connected && (
          <span className="connection-status">Reconnecting...</span>
        )}
        <ThemeToggle />
      </div>

      <div className="room-layout">
        <div className="room-main">
          <TicketPanel ticket={currentTicket} />
        </div>

        <div className="room-sidebar">
          {(isVoting || isCountingDown) && (
            <VotingPanel
              scaleId={roomState?.scale ?? ""}
              selectedValue={myVote?.value ?? null}
              disabled={false}
              onVote={submitVote}
            />
          )}

          {isRevealed && currentTicket && (
            <VoteResults votes={currentTicket.votes} users={users} />
          )}

          <UserList
            users={users}
            votes={currentTicket?.votes ?? []}
            revealed={isRevealed}
          />

          <TicketList
            tickets={tickets}
            currentTicketId={roomState?.currentTicketId ?? ""}
            isAdmin={isAdmin}
            onSelectTicket={isCountingDown ? undefined : setTicket}
          />
        </div>
      </div>

      {isCountingDown && (
        <CountdownOverlay
          from={roomState?.countdown ?? 3}
          onComplete={onCountdownComplete}
        />
      )}

      {isAdmin && (
        <FloatingAdminPanel
          roomId={roomId}
          roomState={roomState?.state ?? "idle"}
          hasPrevTicket={hasPrevTicket}
          hasNextTicket={hasNextTicket}
          hasTickets={tickets.length > 0}
          onReveal={isCountingDown ? revealVotes : startReveal}
          onReset={resetVotes}
          onPrevTicket={prevTicket}
          onNextTicket={nextTicket}
          onAddTicket={addTicket}
          onStartFreeVote={startFreeVote}
        />
      )}
    </div>
  );
}
