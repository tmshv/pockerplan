# Vote Button Toggle

## Context

Users currently have no way to deselect a vote — clicking the already-selected button just re-submits the same value. The goal is to let users "un-vote" by clicking their currently selected card, returning to an unvoted state. This requires a new `remove_vote` RPC on the backend, and a toggle wrapper on the frontend.

## Changes

### Task 1: Backend — add `RemoveVoteRequest` type
- [x] In `ppback/model/types.go` (after `SubmitVoteRequest`, line 88), add:
  ```go
  type RemoveVoteRequest struct {
      RoomID string `json:"roomId"`
      UserID string `json:"userId"`
  }
  ```

### Task 2: Backend — add `RemoveVote` function
- [x] In `ppback/room/room.go` (after `SubmitVote`, around line 63), add:
  ```go
  // RemoveVote removes the current user's vote from the current ticket.
  func RemoveVote(r *model.Room, userID string) error {
      if r.State != model.RoomStateVoting && r.State != model.RoomStateCountingDown {
          return ErrNotVoting
      }
      if r.CurrentTicketID == "" {
          return ErrNoCurrentTicket
      }
      if _, ok := r.Users[userID]; !ok {
          return ErrUserNotFound
      }
      ticket := findTicket(r, r.CurrentTicketID)
      if ticket == nil {
          return ErrTicketNotFound
      }
      delete(ticket.Votes, userID)
      touch(r)
      return nil
  }
  ```

### Task 3: Backend — add `remove_vote` RPC handler
- [x] In `ppback/hub/hub.go`, add `"remove_vote"` to the switch in `handleRPC` (around line 184):
  ```go
  case "remove_vote":
      return h.rpcRemoveVote(client, data)
  ```
- [x] Add handler (modeled after `rpcSubmitVote`, lines 324–353), but without the value field validation and using `room.RemoveVote`:
  ```go
  func (h *Hub) rpcRemoveVote(client *centrifuge.Client, data []byte) ([]byte, error) {
      var req model.RemoveVoteRequest
      if err := json.Unmarshal(data, &req); err != nil {
          return nil, centrifuge.ErrorBadRequest
      }
      if req.RoomID == "" || req.UserID == "" {
          return nil, centrifuge.ErrorBadRequest
      }
      h.mu.RLock()
      info, ok := h.clients[client.ID()]
      h.mu.RUnlock()
      if !ok || info.UserID != req.UserID || info.RoomID != req.RoomID {
          return nil, centrifuge.ErrorPermissionDenied
      }
      err := h.rooms.WithRoom(req.RoomID, func(r *model.Room) error {
          return room.RemoveVote(r, req.UserID)
      })
      if err != nil {
          if errors.Is(err, room.ErrRoomNotFound) {
              return nil, errorNotFound
          }
          return nil, &centrifuge.Error{Code: 400, Message: err.Error()}
      }
      h.broadcastRoomState(req.RoomID)
      return []byte(`{}`), nil
  }
  ```

### Task 4: Frontend — add `RemoveVoteRequest` type
- [x] In `ppfront/src/types/index.ts` (after `SubmitVoteRequest`, line 87), add:
  ```ts
  export interface RemoveVoteRequest {
    roomId: string;
    userId: string;
  }
  ```

### Task 5: Frontend — add `removeVote` to `useRoom.ts`
- [ ] Import `RemoveVoteRequest` alongside `SubmitVoteRequest` (line 11)
- [ ] Add `removeVote: () => Promise<void>` to `UseRoomResult` interface (line 32)
- [ ] Add `removeVote` function (after `submitVote`, around line 192):
  ```ts
  const removeVote = useCallback(async () => {
    if (!roomId) return;
    const info = loadRoomInfo(roomId);
    if (!info) throw new Error("Not joined");
    const client = getCentrifuge();
    const req: RemoveVoteRequest = { roomId, userId: info.userId };
    await client.rpc("remove_vote", req);
  }, [roomId]);
  ```
- [ ] Add `removeVote` to the returned object

### Task 6: Frontend — wire up toggle in `RoomPage.tsx`
- [ ] Destructure `removeVote` from `useRoomContext()` (alongside `submitVote`)
- [ ] Replace `onVote={submitVote}` (line 223) with a toggle handler:
  ```tsx
  onVote={(value) => {
    if (myVote?.value === value) {
      removeVote();
    } else {
      submitVote(value);
    }
  }}
  ```

Note: `VotingPanel.tsx` needs no changes — it already calls `onVote(v)` on every click.

### Task 7: Backend tests for `RemoveVote`
- [ ] In `ppback/room/room_test.go` (follow the pattern of `TestSubmitVote` and neighbors), add:
  - `TestRemoveVote` — user submits a vote, then removes it; ticket has no votes for that user
  - `TestRemoveVoteNoVote` — user removes without having voted; no error (delete on absent key is a no-op)
  - `TestRemoveVoteNotVoting` — rejects when room state is `revealed` or `idle`; returns `ErrNotVoting`
  - `TestRemoveVoteUnknownUser` — user not in room; returns `ErrUserNotFound`
  - `TestRemoveVoteDuringCountingDown` — succeeds in `counting_down` state (mirrors `TestSubmitVoteDuringCountingDown`)

### Task 8: Frontend tests for `VotingPanel` toggle
- [ ] In `ppfront/src/components/VotingPanel.test.tsx`, add a test verifying that clicking the already-selected card still calls `onVote(v)` — this confirms `VotingPanel` doesn't suppress calls on re-click, and that the toggle decision is left to the parent

## Critical Files

| File                                              | Change                              |
| ------------------------------------------------- | ----------------------------------- |
| `ppback/model/types.go`                           | Add `RemoveVoteRequest`             |
| `ppback/room/room.go`                             | Add `RemoveVote` function           |
| `ppback/hub/hub.go`                               | Add RPC dispatch + handler          |
| `ppback/room/room_test.go`                        | Add `RemoveVote` tests              |
| `ppfront/src/types/index.ts`                      | Add `RemoveVoteRequest` interface   |
| `ppfront/src/hooks/useRoom.ts`                    | Add `removeVote` function + export  |
| `ppfront/src/pages/RoomPage.tsx`                  | Toggle wrapper for `onVote`         |
| `ppfront/src/components/VotingPanel.test.tsx`     | Add re-click test                   |

## Verification

1. Start the backend: `cd ppback && go run .`
2. Start the frontend: `cd ppfront && npm run dev`
3. Open a room with two browser tabs (one as voter)
4. Cast a vote — the card should appear selected
5. Click the same card again — the selection should clear and the user's "voted" indicator in the user list should disappear
6. Click a different card — selection should switch normally
7. In the second tab, verify the vote count updates correctly in both cases
