# Plan: 6 Features for PockerPlan

## Context

The PockerPlan app is a planning poker tool with a Go backend (Centrifuge WebSocket) and React/TypeScript frontend. The user wants 6 improvements: share button, instant room loading, editable room name, single-field ticket editor with CodeMirror, layout redesign with a floating admin panel, and event logging. All data is in-memory, so breaking model changes are safe (no migration needed).

## Implementation Order

Features are ordered by dependency:
1. **Logging** (standalone backend)
2. **Room name** (new model field, needed before admin panel)
3. **Ticket content field + CodeMirror** (model change, needed before layout)
4. **Share button** (new component, needed in admin panel)
5. **Room opens immediately** (frontend-only)
6. **Floating admin panel** (depends on 2, 3, 4)

---

## Task 1: Log Centrifuge Events
- [x] In `rpcCreateRoom` (hub.go ~line 238), log room creation with room ID, user ID, user name, scale
- [x] In `rpcJoinRoom` (hub.go ~line 288), log user connection with room ID, user ID, user name
- [x] In `handleDisconnect` (hub.go ~line 483), log user disconnection with room ID, user ID
- [x] Add debug-level log for "client disconnected but user still has active connections" case

**Files:** `ppback/hub/hub.go`

---

## Task 2: Editable Room Name

### Backend
- [x] Add `Name string` field to `Room` and `RoomSnapshot` in `ppback/model/types.go`
- [x] Add `UpdateRoomNameRequest` type: `{RoomID, AdminSecret, Name}`
- [x] Add `SetName(r, name)` function in `ppback/room/room.go`
- [x] Include `Name` in `Snapshot()` output
- [x] Add `update_room_name` RPC handler in `ppback/hub/hub.go` (follows existing admin RPC pattern: validate admin secret, call `SetName`, broadcast)
- [x] Add tests for `SetName` and `update_room_name` RPC

### Frontend
- [x] Add `name` to `RoomSnapshot` and `UpdateRoomNameRequest` type in `types/index.ts`
- [x] Add `updateRoomName(name)` action to `useRoom.ts` hook
- [x] Create `RoomNameEditor` component: shows name as text, click-to-edit for admin, read-only for guest. Placeholder: "Unnamed Room"
- [x] Add test for `RoomNameEditor`

**Files:** `ppback/model/types.go`, `ppback/room/room.go`, `ppback/hub/hub.go`, `ppback/room/room_test.go`, `ppback/hub/hub_test.go`, `ppfront/src/types/index.ts`, `ppfront/src/hooks/useRoom.ts`, NEW `ppfront/src/components/RoomNameEditor.tsx`

---

## Task 3: Single Ticket Field + CodeMirror

### Backend
- [x] Replace `Title`+`Description` with `Content string` in `Ticket`, `TicketSnapshot`, `AddTicketRequest` (`ppback/model/types.go`)
- [x] Update `Snapshot()` in `ppback/room/room.go` to use `Content`
- [x] Update `rpcAddTicket` validation: check `req.Content` instead of `req.Title`
- [x] Update all Go test files for the new field name

### Frontend
- [x] Install CodeMirror 6: `@codemirror/lang-markdown`, `@codemirror/language-data`, `codemirror`, `@codemirror/view`, `@codemirror/state`, `@codemirror/theme-one-dark`
- [x] Update `Ticket`, `TicketSnapshot`, `AddTicketRequest` types to use `content` field
- [x] Create `MarkdownEditor` component: thin CodeMirror 6 wrapper with markdown mode and dark theme
- [x] Rewrite `TicketForm`: single `MarkdownEditor` replaces title input + description textarea
- [x] Update `TicketPanel`: render `ticket.content` as markdown (no `<h2>` title, just full markdown block)
- [x] Update `addTicket` in `useRoom.ts`: signature changes to `(content: string)`
- [x] Update `RoomPage.tsx` `onAdd` callback
- [x] Create mock `MarkdownEditor` for tests (CodeMirror doesn't work in jsdom)
- [x] Update `TicketForm.test.tsx` and `TicketPanel.test.tsx`

**Files:** `ppback/model/types.go`, `ppback/room/room.go`, `ppback/hub/hub.go`, `ppback/room/room_test.go`, `ppback/hub/hub_test.go`, `ppfront/package.json`, `ppfront/src/types/index.ts`, `ppfront/src/hooks/useRoom.ts`, `ppfront/src/pages/RoomPage.tsx`, `ppfront/src/components/TicketForm.tsx`, `ppfront/src/components/TicketPanel.tsx`, NEW `ppfront/src/components/MarkdownEditor.tsx`

---

## Task 4: Share Button
- [ ] Create `ShareButton` component: copies `{origin}/room/{roomId}/join` to clipboard, shows "Copied!" feedback for 2s
- [ ] Add styles in `App.css`
- [ ] Add test for `ShareButton`

**Files:** NEW `ppfront/src/components/ShareButton.tsx`, `ppfront/src/App.css`

---

## Task 5: Room Opens Immediately
- [ ] Remove the loading/spinner early return in `RoomPage.tsx` (lines 111-120)
- [ ] Render the room layout always; pass `roomState?.users ?? []` etc.
- [ ] Keep the error early return as-is
- [ ] Existing components already handle null/empty gracefully: `TicketPanel` shows "No ticket selected", `VotingPanel`/`VoteResults` only render when state matches

**Files:** `ppfront/src/pages/RoomPage.tsx`

---

## Task 6: Layout Redesign - Floating Admin Panel
- [ ] Create `FloatingAdminPanel` component containing: `ShareButton`, `AdminControls`, `TicketForm`
- [ ] Add collapse/expand toggle
- [ ] Restructure `RoomPage`: remove inline admin controls, add `FloatingAdminPanel` rendered outside the layout flow
- [ ] Put `RoomNameEditor` in the room header (inline-editable for admin, read-only for guest)
- [ ] Room layout is now identical for admin and guest: header + main (ticket/voting/results) + sidebar (users)
- [ ] Add CSS for floating panel: `position: fixed`, bottom-right, `z-index: 100`, dark background, border, shadow, scrollable
- [ ] Add collapsed state style
- [ ] Add test for `FloatingAdminPanel`

**Files:** NEW `ppfront/src/components/FloatingAdminPanel.tsx`, `ppfront/src/pages/RoomPage.tsx`, `ppfront/src/App.css`

---

## Verification

1. Run backend tests: `make test-backend`
2. Run frontend tests: `make test-frontend`
3. Run dev server: `make dev`
4. Test manually:
   - Create a room, verify room name is editable
   - Copy join link via share button, open in new tab
   - Verify the second tab shows the room immediately (no spinner)
   - Add a ticket using CodeMirror markdown editor
   - Verify both admin and guest see the same layout
   - Verify admin floating panel has all controls
   - Check server logs for room creation and user connection events
