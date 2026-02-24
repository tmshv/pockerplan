# Ticket Navigation, Layout Rework, and Countdown Animation

## Context

The poker planning app currently supports basic forward-only ticket flow: admin adds a ticket, users vote, admin reveals, admin clicks "Next Ticket" to jump to the next pending ticket. There is no way to go back to a previously-voted ticket, no visible ticket list, and no reveal animation. The layout puts the ticket description in the main area with voting controls, and the sidebar only contains the player list.

This plan adds: a ticket list visible to all users, bidirectional prev/next navigation for the admin, a two-column layout with article-style ticket content on the left and sticky voting/players on the right, and a countdown animation before vote reveal (configurable via CLI).

---

## Task 1: Add `--countdown` CLI arg and propagate to Room model

- [ ] `main.go`: Add `Countdown int` to CLI struct with `default:"3"` and `env:"COUNTDOWN"`
- [ ] `main.go`: Pass `cli.Countdown` to `hub.New()`
- [ ] `ppback/model/types.go`: Add `Countdown int` field to `Room` struct (json tag: `"countdown"`)
- [ ] `ppback/model/types.go`: Add `RoomStateCountingDown RoomState = "counting_down"` constant
- [ ] `ppback/model/types.go`: Add `Countdown int` field to `RoomSnapshot`
- [ ] `ppback/room/manager.go`: Add `countdown int` param to `Create()`, set `r.Countdown = countdown`
- [ ] `ppback/hub/hub.go`: Add `countdown int` field to `Hub` struct, accept it in `New()`, pass to `rooms.Create()`
- [ ] `ppback/room/room.go`: Include `Countdown: r.Countdown` in `Snapshot()` return

## Task 2: Rework ticket navigation (bidirectional by index)

### Backend

- [ ] `ppback/model/types.go`: Add `SetTicketRequest` struct (`RoomID`, `AdminSecret`, `TicketID`)
- [ ] `ppback/room/room.go`: Add `NavigateToTicket(r, ticketID)` function
  - If ticket is `pending` -> set status to `voting`, room state to `voting`
  - If ticket is `revealed` -> room state to `revealed` (keep votes intact)
  - If ticket is `skipped` -> re-open: set status to `voting`, clear votes, room state to `voting`
  - If ticket is `voting` -> room state to `voting` (no change)
- [ ] `ppback/room/room.go`: Add `ticketIndex(r, id) int` helper
- [ ] `ppback/room/room.go`: Add `NextTicketByIndex(r)` — navigate to `tickets[currentIndex+1]` via `NavigateToTicket`, return `ErrTicketNotFound` if at end or empty
- [ ] `ppback/room/room.go`: Add `PrevTicket(r)` — navigate to `tickets[currentIndex-1]` via `NavigateToTicket`, return `ErrTicketNotFound` if at start or empty
- [ ] `ppback/hub/hub.go`: Change `rpcNextTicket` to call `room.NextTicketByIndex` instead of `room.NextTicket`
- [ ] `ppback/hub/hub.go`: Add `set_ticket` RPC handler calling `room.NavigateToTicket`
- [ ] `ppback/hub/hub.go`: Add `prev_ticket` RPC handler calling `room.PrevTicket`
- [ ] Keep existing `NextTicket()` and `SetCurrentTicket()` functions for backward compat (tests use them), but the RPCs now use the new functions

### Frontend

- [ ] `ppfront/src/types/index.ts`: Update `RoomState` to include `"counting_down"`
- [ ] `ppfront/src/types/index.ts`: Add `countdown: number` to `RoomSnapshot`
- [ ] `ppfront/src/types/index.ts`: Add `SetTicketRequest` interface
- [ ] `ppfront/src/hooks/useRoom.ts`: Add `prevTicket`, `setTicket` to `UseRoomResult` and implement them
- [ ] `ppfront/src/components/AdminControls.tsx`: Add `hasPrevTicket`, `hasNextTicket`, `onPrevTicket` props; replace single "Next Ticket" button with Prev/Next pair
- [ ] `ppfront/src/components/FloatingAdminPanel.tsx`: Thread new navigation props through
- [ ] `ppfront/src/pages/RoomPage.tsx`: Compute `currentTicketIndex`, `hasPrevTicket`, `hasNextTicket`; destructure `prevTicket`, `setTicket` from context; pass to admin panel

## Task 3: Ticket list component

- [ ] Create `ppfront/src/components/TicketList.tsx`:
  - Show ordered list of all tickets with index number, truncated content preview, status badge
  - Highlight current ticket
  - Admin can click any ticket to navigate to it (calls `setTicket`)
  - Empty state: "No tickets yet"
- [ ] `ppfront/src/App.css`: Add `.ticket-list` styles (list items, current highlight, clickable hover, status badges)

## Task 4: Countdown animation on reveal

### Backend

- [ ] `ppback/room/room.go`: Add `StartCountdown(r)` — transitions from `voting` to `counting_down`
- [ ] `ppback/room/room.go`: Update `RevealVotes` to accept both `voting` and `counting_down` states
- [ ] `ppback/room/room.go`: Update `SubmitVote` to accept both `voting` and `counting_down` states (last-second votes)
- [ ] `ppback/room/room.go`: Update `ResetVotes` to work from `counting_down` state too (admin cancels)
- [ ] `ppback/hub/hub.go`: Add `start_reveal` RPC handler calling `room.StartCountdown`

### Frontend

- [ ] `ppfront/src/hooks/useRoom.ts`: Add `startReveal` to `UseRoomResult` (calls `adminAction("start_reveal")`)
- [ ] Create `ppfront/src/components/CountdownOverlay.tsx`:
  - Accepts `from` (number) and `onComplete` callback
  - Counts down 1/sec with pulsing animation
  - Calls `onComplete` when reaching 0
- [ ] `ppfront/src/App.css`: Add `.countdown-overlay` and `.countdown-number` styles (centered overlay, large pulsing number)
- [ ] `ppfront/src/pages/RoomPage.tsx`:
  - When `roomState.state === "counting_down"`: render `CountdownOverlay`
  - `onComplete`: if admin, call `revealVotes()`; if non-admin, do nothing (wait for broadcast)
  - Wire `startReveal` to admin panel's `onReveal` instead of `revealVotes`

## Task 5: Two-column layout rework

- [ ] `ppfront/src/App.css`:
  - Increase `#root` max-width to `1200px`
  - `.room-layout`: add `align-items: flex-start` for sticky positioning
  - `.room-sidebar`: increase width to `320px`, add `position: sticky; top: 2rem; max-height: calc(100vh - 4rem); overflow-y: auto`
  - `.ticket-description`: increase padding, add `line-height: 1.6` for article-style reading
- [ ] `ppfront/src/pages/RoomPage.tsx`: Restructure layout:
  - **Left column** (`.room-main`): `TicketPanel` only (article-style, scrolls with page)
  - **Right column** (`.room-sidebar`, sticky): `VotingPanel`, `VoteResults`, `UserList`, `TicketList`

## Task 6: Tests

- [ ] `ppback/room/room_test.go`: Add tests for:
  - `NavigateToTicket` — pending/revealed/skipped/voting transitions
  - `NextTicketByIndex` — sequential navigation, error at end
  - `PrevTicket` — backward navigation, error at start
  - `StartCountdown` — voting -> counting_down transition
  - `RevealVotes` from `counting_down` state
  - `SubmitVote` during `counting_down`
  - Full navigation flow: add 3 tickets, go forward, go back, verify states preserved

---

## Key Files

| File                                               | Changes                                                    |
|----------------------------------------------------|------------------------------------------------------------|
| `main.go`                                          | CLI `--countdown` arg, pass to hub                         |
| `ppback/model/types.go`                            | `counting_down` state, `Countdown` field, `SetTicketRequest` |
| `ppback/room/room.go`                              | `NavigateToTicket`, `PrevTicket`, `NextTicketByIndex`, `StartCountdown` |
| `ppback/room/manager.go`                           | `countdown` param on `Create()`                            |
| `ppback/hub/hub.go`                                | `set_ticket`, `prev_ticket`, `start_reveal` RPCs           |
| `ppfront/src/types/index.ts`                       | New types, updated `RoomState` and `RoomSnapshot`          |
| `ppfront/src/hooks/useRoom.ts`                     | `prevTicket`, `setTicket`, `startReveal`                   |
| `ppfront/src/pages/RoomPage.tsx`                   | Layout restructure, countdown integration, nav state       |
| `ppfront/src/components/AdminControls.tsx`          | Prev/Next buttons                                          |
| `ppfront/src/components/FloatingAdminPanel.tsx`     | Thread new props                                           |
| `ppfront/src/components/TicketList.tsx`             | New file                                                   |
| `ppfront/src/components/CountdownOverlay.tsx`       | New file                                                   |
| `ppfront/src/App.css`                              | Layout rework, ticket list styles, countdown styles        |
| `ppback/room/room_test.go`                         | New tests                                                  |

## Verification

1. `cd ppback && go test ./...` — all existing + new tests pass
2. `cd ppfront && npm run build` — frontend builds without errors
3. Run the server with `go run . --countdown 5`
4. Manual testing:
   - Create room, add 3 tickets via admin panel
   - Navigate forward/backward with Prev/Next buttons
   - Click a ticket in the list to jump to it
   - Vote and reveal — verify 5-second countdown overlay appears
   - After reveal, navigate back to see preserved results
   - Verify layout: ticket content scrolls on left, sidebar stays sticky on right
   - Verify empty room (no tickets) shows graceful empty state
   - Verify non-admin users see countdown but don't trigger reveal
