# Plan: Tickets Flag, Poker Table View, Paper Throw

## Context

Three UX enhancements to pockerplan:

1. **Optional tickets** — Tickets are a core feature today. Make them opt-in via `--ticket` server flag so the app also works as a simple vote-and-reset board without ticket management.
2. **Poker table view** — Add a visual representation of the room in the main area: an oval table with user avatars seated around it, showing vote status and a "thinking" indicator.
3. **Paper throw** — A fun social gesture: drag from your avatar and drop on another player to launch a 📝 emoji flying across the screen, visible to everyone.

---

## Feature 1: `--ticket` Server Flag

### What changes

- `--ticket` flag disables all ticket-related UI when absent (server default = disabled).
- The backend is the **sole authority** on whether tickets are enabled. On every state broadcast, it sends a `ticketsEnabled` command field inside `RoomSnapshot`. The frontend must treat this as an authoritative directive and reactively enable/disable all ticket UI — it must not infer ticket mode from any other source.
- Without tickets: no TicketPanel, no TicketList, no add-ticket form, no prev/next buttons.
- Admin can still start free vote, reset votes, and reveal.

### Backend

**`main.go`**
- Add `Tickets bool` field to the `cli` struct:
  ```go
  Tickets bool `default:"false" env:"TICKETS" help:"Enable tickets feature."`
  ```
- Pass `cli.Tickets` to `hub.New()`.

**`ppback/hub/hub.go`**
- Add `ticketsEnabled bool` field to `Hub` struct.
- Accept it as a parameter in `hub.New()`.
- Add helper `buildSnapshot(r *model.Room) *model.RoomSnapshot` that calls `room.Snapshot(r)` and then sets `snap.TicketsEnabled = h.ticketsEnabled`. Replace all `room.Snapshot(r)` calls inside the hub with `h.buildSnapshot(r)`. This ensures **every** snapshot publication carries the command, including reconnects.

**`ppback/model/types.go`**
- Add `TicketsEnabled bool` to `RoomSnapshot`:
  ```go
  TicketsEnabled bool `json:"ticketsEnabled"`
  ```

### Frontend

**`ppfront/src/types/index.ts`**
- Add `ticketsEnabled: boolean` to `RoomSnapshot`.

**`ppfront/src/pages/RoomPage.tsx`**
- Extract `ticketsEnabled = roomState?.ticketsEnabled ?? false`.
- Treat this value as a server command — do not default to `true` or derive it locally.
- Wrap `<TicketPanel>` in `{ticketsEnabled && ...}`.
- Wrap `<TicketList>` in `{ticketsEnabled && ...}`.
- Pass `ticketsEnabled` to `FloatingAdminPanel`.
- When `!ticketsEnabled`: set `hasPrevTicket` / `hasNextTicket` to `false`.

**`ppfront/src/components/FloatingAdminPanel.tsx`**
- Accept `ticketsEnabled: boolean` prop.
- Hide the `<TicketForm>` when `!ticketsEnabled`.
- Hide the prev/next ticket buttons when `!ticketsEnabled`.
- Show a "Start Vote" / "Start Free Vote" button as the primary action when tickets are off.

---

## Feature 2: Poker Table View

### What changes

- New `PokerTable` component renders above the ticket content in `.room-main`.
- Users placed around an ellipse: avatar emoji + name + status indicator.
- Status: **voted** (✓ badge), **not voted** (empty card), **thinking** (animated 💭).
- "Thinking" is detected via a WebSocket heartbeat: frontend sends `set_thinking` RPC when the user actively interacts with the vote panel.

### Backend

**`ppback/model/types.go`**
- Add `Thinking bool` to `User`:
  ```go
  Thinking bool `json:"thinking"`
  ```
- Add new RPC request type:
  ```go
  type SetThinkingRequest struct {
      RoomID  string `json:"roomId"`
      UserID  string `json:"userId"`
      Thinking bool  `json:"thinking"`
  }
  ```

**`ppback/hub/hub.go`**
- Add `"set_thinking"` case in `handleRPC` → `rpcSetThinking`.
- `rpcSetThinking`: unmarshal, verify caller identity via `h.clients`, update `room.Users[userID].Thinking`, broadcast.
- In `rpcResetVotes` (after success): clear `Thinking` on all users before broadcasting.

**`ppback/room/room.go`**
- In `ResetVotes()`, clear `Thinking` for all users:
  ```go
  for _, u := range r.Users {
      u.Thinking = false
  }
  ```

### Frontend

**`ppfront/src/components/PokerTable.tsx`** _(new file)_
- Props: `users: User[]`, `votes: VoteInfo[]`, `revealed: boolean`, `currentUserId: string`, `onPositionsChange: (positions: Map<string, {x: number, y: number}>) => void`, `onDrop: (targetUserId: string) => void`.
- Renders a fixed-size container (e.g. `600 × 320px`) with a centered oval (CSS `border-radius: 50%`, green-ish fill).
- Positions N users around the ellipse perimeter using:
  ```ts
  const angle = (i / N) * 2 * Math.PI - Math.PI / 2  // top = 0
  const x = cx + rx * Math.cos(angle)
  const y = cy + ry * Math.sin(angle)
  ```
- Each user slot: avatar emoji (large), name (below, truncated), status badge.
  - Voted: `✓` in green
  - Thinking: `💭` with a `fade-in-out` CSS animation
  - Not voted: empty card `🃏` in gray
- Self avatar: `draggable={true}`, `onDragStart` records source.
- Other avatars: `onDragOver` (prevent default) + `onDrop` calls `onDrop(userId)`.
- After layout, calls `onPositionsChange` with computed `{x, y}` per user.

**`ppfront/src/hooks/useThinkingHeartbeat.ts`** _(new file)_
- Accepts `setThinking: (active: boolean) => Promise<void>`, `isVoting: boolean`.
- Exports `onInteraction()`.
- On `onInteraction()`: calls `setThinking(true)`, resets a 3-second debounce timer.
- When timer fires: calls `setThinking(false)`.
- On `isVoting` going `false`: cancels timer, calls `setThinking(false)` if active.

**`ppfront/src/hooks/useRoom.ts`**
- Add `setThinking(active: boolean): Promise<void>` action (new RPC call `set_thinking`).

**`ppfront/src/pages/RoomPage.tsx`**
- Instantiate `useThinkingHeartbeat` with `setThinking` and `isVoting`.
- Pass `onInteraction` to `VotingPanel` and call it in `useKeyboardShortcuts` on vote keypress.
- Add `userPositions = useRef<Map<string, {x: number; y: number}>>(new Map())`.
- Render `<PokerTable>` above `<TicketPanel>` in `.room-main`.

**`ppfront/src/components/VotingPanel.tsx`**
- Accept optional `onInteraction?: () => void` prop.
- Call on `onMouseEnter` of the panel container.

---

## Feature 3: Player Interaction Animation

### What changes

- Drag from self avatar → drop on target avatar → sends `interact_player` RPC with `action: "paper_throw"`.
- The RPC and event model are intentionally generic (`interact_player` / `player_interaction`) to support future interaction types (e.g. high-five, emoji reactions).
- Server adds event to room's pending events, broadcasts with next snapshot.
- All clients receive the event and render the appropriate animation (currently: 📝 arc fly).

### Backend

**`ppback/model/types.go`**
- Add `RoomEvent` struct with `Action` for extensibility:
  ```go
  type RoomEvent struct {
      Type   string `json:"type"`   // always "player_interaction"
      Action string `json:"action"` // "paper_throw"; extendable later
      FromID string `json:"fromId"`
      ToID   string `json:"toId"`
  }
  ```
- Add `PendingEvents []RoomEvent` to `Room` struct.
- Add `Events []RoomEvent` to `RoomSnapshot` (omitempty):
  ```go
  Events []RoomEvent `json:"events,omitempty"`
  ```
- Add `InteractPlayerRequest`:
  ```go
  type InteractPlayerRequest struct {
      RoomID       string `json:"roomId"`
      UserID       string `json:"userId"`
      TargetUserID string `json:"targetUserId"`
      Action       string `json:"action"` // e.g. "paper_throw"
  }
  ```

**`ppback/room/room.go`**
- In `Snapshot()`, include and clear pending events:
  ```go
  snap.Events = r.PendingEvents
  r.PendingEvents = nil
  ```

**`ppback/hub/hub.go`**
- Add `"interact_player"` case → `rpcInteractPlayer`.
- `rpcInteractPlayer`: verify caller identity, verify target user exists in room, validate `Action` is non-empty, append `RoomEvent{Type: "player_interaction", Action: req.Action, FromID: req.UserID, ToID: req.TargetUserID}` to `room.PendingEvents`, broadcast.

### Frontend

**`ppfront/src/types/index.ts`**
- Add `RoomEvent` interface (with `type`, `action`, `fromId`, `toId`) and `events?: RoomEvent[]` to `RoomSnapshot`.

**`ppfront/src/hooks/useRoom.ts`**
- Add `interactPlayer(action: string, targetUserId: string): Promise<void>` action (calls `interact_player` RPC).

**`ppfront/src/components/PlayerInteractionLayer.tsx`** _(new file, was PaperThrowLayer)_
- Props: `events: RoomEvent[]`, `userPositions: Map<string, {x: number, y: number}>`.
- Dispatches to action-specific renderers: currently only `"paper_throw"` is handled.
- For `paper_throw`: maintains `activeThrows` state, looks up positions, renders animated emoji.
- Renders each throw as a `<span>` with `position: absolute` and CSS custom properties `--dx`, `--dy` for the translation delta.
- CSS keyframe `paper-fly`:
  ```css
  @keyframes paper-fly {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; font-size: 2rem; }
    50%  { transform: translate(calc(var(--dx) * 0.5), calc(var(--dy) * 0.5 - 80px)) rotate(180deg); }
    100% { transform: translate(var(--dx), var(--dy)) rotate(360deg) scale(0.3); opacity: 0; }
  }
  ```
- Duration: 1.4s. After completion (via `onAnimationEnd`), remove from state.
- Layer is absolutely positioned, `pointer-events: none`, `z-index: 150` (above cards, below countdown overlay).

**`ppfront/src/pages/RoomPage.tsx`**
- Pass `userPositions` ref and `interactPlayer` to `PokerTable`.
- Process `roomState?.events` and feed to `PlayerInteractionLayer`.
- Render `<PlayerInteractionLayer>` as sibling to `<PokerTable>` inside `.room-main` (which gets `position: relative`).

**`ppfront/src/components/PokerTable.tsx`**
- Props include `onInteract: (action: string, targetUserId: string) => void`.
- On drop: calls `onInteract("paper_throw", targetUserId)`.

---

## Critical Files

| File                                                      | Change                                  |
|-----------------------------------------------------------|-----------------------------------------|
| `main.go`                                                 | Add `--ticket` flag                     |
| `ppback/model/types.go`                                   | User.Thinking, RoomEvent, Events fields |
| `ppback/hub/hub.go`                                       | 3 new RPC handlers, buildSnapshot helper|
| `ppback/room/room.go`                                     | Clear thinking on reset, snapshot events|
| `ppfront/src/types/index.ts`                              | Sync TS types with Go model             |
| `ppfront/src/pages/RoomPage.tsx`                          | Wire all 3 features                     |
| `ppfront/src/components/PokerTable.tsx`                   | New component                           |
| `ppfront/src/components/PlayerInteractionLayer.tsx`        | New component (extensible interaction)  |
| `ppfront/src/hooks/useThinkingHeartbeat.ts`               | New hook                                |
| `ppfront/src/hooks/useRoom.ts`                            | 2 new actions (setThinking, interactPlayer) |
| `ppfront/src/components/FloatingAdminPanel.tsx`           | Hide ticket controls when disabled      |

---

## Task 1: `--ticket` Server Flag

- [x] `main.go`: Add `Tickets bool` to CLI struct with `default:"false" env:"TICKETS" help:"Enable tickets feature."`
- [x] `main.go`: Pass `cli.Tickets` to `hub.New()`
- [x] `ppback/model/types.go`: Add `TicketsEnabled bool` field to `RoomSnapshot`
- [x] `ppback/hub/hub.go`: Add `ticketsEnabled bool` field to Hub struct, accept in `New()`
- [x] `ppback/hub/hub.go`: Add `buildSnapshot(r *model.Room) *model.RoomSnapshot` helper that wraps `room.Snapshot(r)` and sets `TicketsEnabled`; replace all `room.Snapshot(r)` calls in hub with `h.buildSnapshot(r)`
- [x] `ppfront/src/types/index.ts`: Add `ticketsEnabled: boolean` to `RoomSnapshot`
- [x] `ppfront/src/pages/RoomPage.tsx`: Extract `ticketsEnabled = roomState?.ticketsEnabled ?? false`; wrap `<TicketPanel>` and `<TicketList>` in `{ticketsEnabled && ...}`; pass `ticketsEnabled` to `FloatingAdminPanel`; set `hasPrevTicket`/`hasNextTicket` to false when `!ticketsEnabled`
- [x] `ppfront/src/components/FloatingAdminPanel.tsx`: Accept `ticketsEnabled: boolean` prop; hide `<TicketForm>` and prev/next ticket buttons when `!ticketsEnabled`

## Task 2: Poker Table View

- [x] `ppback/model/types.go`: Add `Thinking bool` to `User` struct; add `SetThinkingRequest` struct
- [x] `ppback/hub/hub.go`: Add `"set_thinking"` case in `handleRPC` → `rpcSetThinking`; implement `rpcSetThinking`
- [x] `ppback/room/room.go`: In `ResetVotes()`, clear `Thinking` for all users
- [x] `ppfront/src/types/index.ts`: Add `thinking?: boolean` to `User`
- [x] `ppfront/src/components/PokerTable.tsx`: New component - oval table with users positioned around ellipse, status badges, drag support
- [x] `ppfront/src/hooks/useThinkingHeartbeat.ts`: New hook - debounced thinking state management
- [x] `ppfront/src/hooks/useRoom.ts`: Add `setThinking(active: boolean): Promise<void>` action
- [x] `ppfront/src/pages/RoomPage.tsx`: Integrate PokerTable, useThinkingHeartbeat, userPositions ref
- [x] `ppfront/src/components/VotingPanel.tsx`: Accept optional `onInteraction?: () => void` prop, call on `onMouseEnter`

## Task 3: Player Interaction Animation

- [ ] `ppback/model/types.go`: Add `RoomEvent` struct, `PendingEvents []RoomEvent` to `Room`, `Events []RoomEvent` to `RoomSnapshot`, `InteractPlayerRequest` struct
- [ ] `ppback/room/room.go`: In `Snapshot()`, include and clear pending events
- [ ] `ppback/hub/hub.go`: Add `"interact_player"` case → `rpcInteractPlayer`; implement `rpcInteractPlayer`
- [ ] `ppfront/src/types/index.ts`: Add `RoomEvent` interface and `events?: RoomEvent[]` to `RoomSnapshot`
- [ ] `ppfront/src/hooks/useRoom.ts`: Add `interactPlayer(action: string, targetUserId: string): Promise<void>` action
- [ ] `ppfront/src/components/PlayerInteractionLayer.tsx`: New component - animated emoji throws with CSS keyframes
- [ ] `ppfront/src/pages/RoomPage.tsx`: Pass `userPositions` and `interactPlayer` to PokerTable; process events; render PlayerInteractionLayer
- [ ] `ppfront/src/components/PokerTable.tsx`: Add `onInteract` prop; call `onInteract("paper_throw", targetUserId)` on drop

## Verification

### Verification 1: Tickets flag
1. `go run . --addr :8080` (no `--ticket`) → join room → confirm no ticket UI, prev/next absent.
2. `go run . --addr :8080 --ticket` → confirm ticket panel, list, and form appear.
3. Without tickets: admin can start free vote, reset, reveal — verify these still work.

### Verification 2: Poker table
1. Open room with 3–5 users → confirm all appear around the oval, names visible.
2. Hover over vote cards → confirm 💭 thinking indicator appears on other clients within ~1s.
3. After 3s of no interaction → thinking clears.
4. Vote → thinking clears immediately for that user, ✓ badge appears.
5. Reset votes → all thinking indicators clear.

### Verification 3: Player interaction (paper throw)
1. Two browser windows in same room → drag from self avatar, drop on other.
2. Confirm both windows show the 📝 flying animation with arc.
3. Animation disappears after ~1.4s.
4. Test with 1 user (no valid target) — drag to own avatar should be a no-op.
5. Verify RPC wire uses `interact_player` with `action: "paper_throw"` (check network tab).
