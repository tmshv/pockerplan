# Planning Poker Application

## Context

Build a real-time planning poker tool for a small team to estimate task complexity during sprint planning. The app allows an admin to create a room, add tickets with markdown descriptions, and run voting sessions. Team members join via a shared link, pick an avatar, and vote using configurable estimation scales (Fibonacci, Power of 2, etc.). All state syncs in real-time via WebSocket using the embedded centrifuge Go library. Ships as a single binary with the React frontend embedded.

## Architecture

- **Backend**: Go, standard `net/http` + embedded `github.com/centrifugal/centrifuge` (no separate Centrifugo server)
- **Frontend**: Vite + React + TypeScript
- **Transport**: WebSocket via centrifuge (RPC for commands, pub/sub for state broadcasts)
- **Storage**: In-memory only (no database), rooms expire after 24h inactivity
- **Build**: Single binary via `//go:embed ppfront/dist`

## Project Structure

```
pockerplan/
├── go.mod
├── main.go                    # Entry point, embed directive, graceful shutdown
├── Makefile
├── ppback/
│   ├── server/
│   │   ├── server.go          # HTTP routes, SPA fallback, WS handler mount
│   │   └── server_test.go
│   ├── hub/
│   │   ├── hub.go             # Centrifuge node, RPC dispatch, broadcast
│   │   └── hub_test.go
│   ├── room/
│   │   ├── room.go            # Sanitization, vote validation, result computation
│   │   ├── manager.go         # Thread-safe room CRUD, TTL cleanup
│   │   ├── room_test.go
│   │   └── manager_test.go
│   ├── model/
│   │   └── types.go           # All data models and RPC request/response types
│   ├── scale/
│   │   ├── scale.go           # Estimation scale definitions
│   │   └── scale_test.go
│   └── avatar/
│       └── avatar.go          # Predefined emoji avatar list
├── ppfront/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig*.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # Router: /, /room/:id/join, /room/:id
│       ├── api/
│       │   ├── rest.ts         # HTTP client for /api/* endpoints
│       │   └── centrifuge.ts   # Centrifuge client singleton
│       ├── context/
│       │   ├── UserContext.tsx  # User identity from localStorage
│       │   └── RoomContext.tsx  # Room state synced from centrifuge
│       ├── hooks/
│       │   ├── useRoom.ts      # Room subscription + RPC wrappers
│       │   └── useUser.ts      # localStorage read/write
│       ├── pages/
│       │   ├── HomePage.tsx    # Create room (pick scale, name, avatar)
│       │   ├── JoinPage.tsx    # Join room (enter name, pick avatar)
│       │   └── RoomPage.tsx    # Main room view
│       ├── components/
│       │   ├── VoteCard.tsx
│       │   ├── VotingPanel.tsx
│       │   ├── UserList.tsx
│       │   ├── TicketPanel.tsx # Renders markdown description
│       │   ├── AdminControls.tsx
│       │   ├── AvatarPicker.tsx
│       │   ├── NameInput.tsx
│       │   ├── VoteResults.tsx
│       │   ├── TicketForm.tsx
│       │   └── ScalePicker.tsx
│       └── types/
│           └── index.ts        # TS types mirroring backend models
```

## Key Data Models

```go
type Room struct {
    ID              string
    AdminSecret     string            // secret token, only admin knows
    Scale           EstimationScale
    State           RoomState         // "idle" | "voting" | "revealed"
    Users           map[string]*User
    Tickets         []*Ticket
    CurrentTicketID string
    CreatedAt       time.Time
    LastActivityAt  time.Time
}

type User struct {
    ID, Name, AvatarID string
    IsAdmin, Connected bool
}

type Ticket struct {
    ID, Title, Description string   // Description is markdown
    Status                 string   // "voting" | "revealed" | "skipped"
    Votes                  map[string]Vote
}
```

## Estimation Scales

| Scale      | Values                                                  |
|------------|---------------------------------------------------------|
| Fibonacci  | 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?               |
| Power of 2 | 1, 2, 4, 8, 16, 32, 64, ?                              |
| Linear     | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ?                       |
| T-shirt    | XS, S, M, L, XL, XXL, ?                                |

## Real-time Protocol

**Channel**: `room:{roomID}` (one channel per room)

**Server-to-Client**: Single event type `room_state` containing a full sanitized room snapshot. Votes are hidden (keys only, no values) when state is `voting`; visible when `revealed`.

**Client-to-Server RPCs**:

| RPC Method     | Auth   | Description                        |
|----------------|--------|------------------------------------|
| `create_room`  | None   | Creates room, returns adminSecret  |
| `join_room`    | None   | Joins room, returns initial state  |
| `submit_vote`  | Member | Submits or changes a vote          |
| `add_ticket`   | Admin  | Adds a new ticket with markdown    |
| `reveal_votes` | Admin  | Reveals all votes simultaneously   |
| `reset_votes`  | Admin  | Clears votes for current ticket    |
| `next_ticket`  | Admin  | Advances to next ticket            |

Every state-changing RPC triggers a `room_state` broadcast to all subscribers.

## Admin Role

- Creator of the room receives an `adminSecret` token
- Admin URL: `/room/{roomId}?admin={secret}` (secret persisted in localStorage per room)
- All admin RPCs require `adminSecret` field — backend validates against `room.AdminSecret`
- If admin disconnects, room persists; admin can rejoin and regain control via the secret

## User Identity

- No auth system. User enters name + picks avatar on join
- Stored in localStorage: `pockerplan_user` (name, avatar) + `pockerplan_room_{roomId}` (userId, adminSecret)
- Server generates userId (UUID) on first join; client stores it for reconnection

## Avatar System

16 predefined emoji avatars (bear, cat, dog, fox, koala, lion, monkey, owl, panda, penguin, rabbit, tiger, unicorn, whale, wolf, octopus). Rendered as large emoji in a picker grid.

## Build System (Makefile)

| Target           | Description                                    |
|------------------|------------------------------------------------|
| `build-frontend` | `cd ppfront && npm ci && npm run build`        |
| `build-backend`  | `go build -o bin/pockerplan .`                 |
| `build`          | Frontend then backend (produces single binary) |
| `test-frontend`  | `cd ppfront && npm run test -- --run`          |
| `test-backend`   | `go test ./ppback/...`                         |
| `test`           | Both test targets                              |
| `dev`            | Concurrent: Vite dev server + Go backend       |

Vite dev server proxies `/api/*` and `/connection/*` to `localhost:8080` for development.

## Go Dependencies

- `github.com/centrifugal/centrifuge` — embedded real-time engine
- `github.com/google/uuid` — ID generation

## Frontend Dependencies

- `centrifuge` — JS client for centrifuge
- `react-router-dom` — routing
- `react-markdown` — render ticket descriptions
- Vitest + React Testing Library for tests

## Implementation Tasks

### Task 1: Project scaffolding
- [x] Initialize `ppfront/` with Vite + React + TypeScript
- [x] Create `ppback/` directory structure with packages
- [x] Add Go dependencies (`centrifuge`, `uuid`)
- [x] Create `Makefile`
- [x] Configure `vite.config.ts` with dev proxy
- [x] Configure `vitest.config.ts`

### Task 2: Backend models, scales, avatars
- [x] Implement `ppback/model/types.go`
- [x] Implement `ppback/scale/scale.go` with all four scales
- [x] Implement `ppback/avatar/avatar.go`
- [x] Write unit tests for scales and avatar validation

### Task 3: Room manager (core business logic)
- [x] Implement `ppback/room/manager.go` — Create, Get, AddUser, RemoveUser
- [x] Implement vote logic — SubmitVote, RevealVotes, ResetVotes
- [x] Implement ticket logic — AddTicket, SetCurrentTicket, NextTicket
- [x] Implement Snapshot (sanitization) and TTL cleanup
- [x] Write unit tests including concurrency tests

### Task 4: Centrifuge hub (real-time layer)
- [x] Implement `ppback/hub/hub.go` — Node setup, event handlers
- [x] Implement RPC dispatch for all methods
- [x] Implement OnDisconnect (update presence, broadcast)
- [x] Implement broadcastRoomState
- [x] Write integration tests

### Task 5: HTTP server and entry point
- [x] Implement `ppback/server/server.go` — routes, SPA fallback
- [x] Implement `main.go` with embed and graceful shutdown
- [x] Write server tests

### Task 6: Frontend foundation
- [x] Install deps: `centrifuge`, `react-router-dom`, `react-markdown`
- [x] Create TypeScript types mirroring backend models
- [x] Implement `UserContext` + `useUser` hook with localStorage
- [x] Implement centrifuge client singleton
- [x] Write hook tests

### Task 7: Frontend join flow
- [x] Build NameInput, AvatarPicker, ScalePicker components
- [x] Build HomePage (create room)
- [x] Build JoinPage (join room)
- [x] Set up routing in App.tsx
- [x] Write component tests

### Task 8: Frontend room experience
- [x] Implement `useRoom` hook + `RoomContext`
- [x] Build VoteCard, VotingPanel, UserList, TicketPanel
- [x] Build VoteResults, AdminControls, TicketForm
- [x] Build RoomPage integrating all components
- [x] Write component tests

### Task 9: Integration and polish
- [x] End-to-end manual testing of full flow
- [x] Error states (room not found, connection lost)
- [x] Loading states
- [x] Verify single-binary build works correctly

## Verification

1. `make test` — all backend and frontend tests pass
2. `make build` — produces `bin/pockerplan` single binary
3. Run binary, open browser:
   - Create room on homepage, copy room link
   - Open link in second browser/incognito, join as another user
   - Admin adds ticket, both users vote, admin reveals — votes appear simultaneously
   - Admin resets, moves to next ticket
4. Verify reconnection: refresh admin's page, admin controls still work
5. Verify different scales work: create rooms with each scale type
