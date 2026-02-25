# Plan: 6 UI/UX Improvements for Pockerplan

## Context

The planning poker app has several UI issues: low contrast in the admin panel and badge components, no theme toggle (dark-only with hardcoded colors), the sidebar scrolls away with the page, no keyboard shortcuts for voting, and no way to run a quick vote without creating tickets. These changes improve usability and accessibility across the board.

## Implementation Order

The theme system (Task 4) must come first because it introduces CSS variables that replace all hardcoded colors. Contrast fixes (Tasks 1, 3) then become simple variable value tweaks. The sidebar fix (Task 5) is CSS-only. The "no ticket" mode (Task 2) needs a backend RPC. Keyboard shortcuts (Task 6) come last since they benefit from understanding the no-ticket voting flow.

---

## Task 1: Theme System with System/Dark/Light Toggle
- [x] Extract ~25 hardcoded colors from `index.css` and `App.css` into CSS custom properties on `:root` (dark default)
- [x] Add `[data-theme="light"]` block with light-theme values
- [x] Add inline script in `index.html` to set `data-theme` from localStorage before React loads (prevents flash)
- [x] Create `ppfront/src/hooks/useTheme.ts` — reads/writes localStorage (`pockerplan_theme`), listens to `matchMedia` for system preference, sets `data-theme` attribute on `<html>`
- [x] Create `ppfront/src/context/ThemeContext.tsx` — provides `{theme, setTheme, resolvedTheme}`
- [x] Create `ppfront/src/components/ThemeToggle.tsx` — three-button segmented control (System/Dark/Light)
- [x] Wrap app with `ThemeProvider` in `App.tsx`
- [x] Place `ThemeToggle` in room header, home page, and join page
- [x] Replace every hardcoded color in `App.css` with `var(--color-*)` references
- [x] Remove the existing `@media (prefers-color-scheme: light)` block from `index.css` (JS handles it now)

**Key files:** `ppfront/src/index.css`, `ppfront/src/App.css`, `ppfront/src/App.tsx`, `ppfront/index.html`
**New files:** `ppfront/src/hooks/useTheme.ts`, `ppfront/src/context/ThemeContext.tsx`, `ppfront/src/components/ThemeToggle.tsx`

### CSS Variable Inventory

| Variable                    | Dark                           | Light              |
|-----------------------------|--------------------------------|--------------------|
| `--color-bg`                | `#242424`                      | `#ffffff`          |
| `--color-text`              | `rgba(255, 255, 255, 0.87)`   | `#213547`          |
| `--color-text-muted`        | `#aaa`                         | `#666`             |
| `--color-text-dimmed`       | `#888`                         | `#999`             |
| `--color-primary`           | `#646cff`                      | `#4f46e5`          |
| `--color-primary-hover`     | `#535bf2`                      | `#4338ca`          |
| `--color-primary-bg`        | `rgba(100, 108, 255, 0.2)`    | `rgba(79,70,229,0.15)` |
| `--color-primary-bg-subtle` | `rgba(100, 108, 255, 0.15)`   | `rgba(79,70,229,0.1)`  |
| `--color-primary-bg-hover`  | `rgba(100, 108, 255, 0.08)`   | `rgba(79,70,229,0.06)` |
| `--color-primary-bg-faint`  | `rgba(100, 108, 255, 0.1)`    | `rgba(79,70,229,0.08)` |
| `--color-button-bg`         | `#1a1a1a`                      | `#f9f9f9`          |
| `--color-border`            | `#555`                         | `#d1d5db`          |
| `--color-border-subtle`     | `#444`                         | `#e5e7eb`          |
| `--color-border-faint`      | `#333`                         | `#f3f4f6`          |
| `--color-error`             | `#e53e3e`                      | `#dc2626`          |
| `--color-warning`           | `#e5a53e`                      | `#d97706`          |
| `--color-status-voting`     | `#2d5a27`                      | `#bbf7d0`          |
| `--color-status-revealed`   | `#5a4227`                      | `#fef3c7`          |
| `--color-status-pending`    | `#333`                         | `#e5e7eb`          |
| `--color-status-skipped`    | `#6b5b5b` (fixed)             | `#fecaca`          |
| `--color-panel-bg`          | `#1e1e3a` (fixed)             | `#ffffff`          |
| `--color-panel-border`      | `#5a5a7a` (fixed)             | `#d1d5db`          |
| `--color-panel-toggle-bg`   | `#2a2a4a`                      | `#f3f4f6`          |
| `--color-panel-toggle-hover`| `#3a3a5a`                      | `#e5e7eb`          |
| `--color-panel-shadow`      | `rgba(0, 0, 0, 0.5)`          | `rgba(0,0,0,0.15)` |
| `--color-overlay`           | `rgba(0, 0, 0, 0.6)`          | `rgba(0,0,0,0.4)`  |
| `--color-spinner-track`     | `#333`                         | `#e5e7eb`          |

---

## Task 2: Fix Admin Panel Contrast
- [ ] Set `--color-panel-bg` to `#1e1e3a` (was `#1a1a2e`, more distinct from page bg)
- [ ] Set `--color-panel-border` to `#5a5a7a` (was `#444`, much more visible)
- [ ] Add explicit button styles inside `.floating-admin-content` — visible background (`var(--color-panel-toggle-bg)`), visible border, proper disabled state

**Key files:** `ppfront/src/App.css` (already being modified in Task 1)

---

## Task 3: Fix Badge/Tag Contrast (Skipped badge)
- [ ] Set `--color-status-skipped` to `#6b5b5b` in dark theme (was `#444`, now clearly distinct from pending `#333`)
- [ ] Light theme uses `#fecaca` (red-tinted pastel) for skipped badge

**Key files:** `ppfront/src/App.css` (already being modified in Task 1)

---

## Task 4: Sticky Sidebar
- [ ] Add `min-height: 0` and `overflow: hidden` to `.room-page` — currently missing, which lets `.room-layout` grow beyond viewport
- [ ] Verify the chain: `#root` (100vh, flex column) -> `.page` (flex: 1) -> `.room-page` (flex: 1, **add min-height: 0**) -> `.room-layout` (grid, flex: 1, overflow: hidden) -> `.room-sidebar` (overflow-y: auto)

**Key file:** `ppfront/src/App.css`

---

## Task 5: "No Ticket" Mode (auto when zero tickets)
- [ ] Add `start_free_vote` RPC in `ppback/hub/hub.go` — creates ephemeral ticket with empty content, sets as current, transitions to voting state
- [ ] Add idempotency guard: if room already has a current empty-content ticket in voting state, no-op
- [ ] Add `startFreeVote` action in `ppfront/src/hooks/useRoom.ts` (calls `start_free_vote` RPC)
- [ ] Pass through in `ppfront/src/context/RoomContext.tsx`
- [ ] Add "Start Voting" button in `AdminControls.tsx` — shown when `roomState === "idle"` and no tickets exist
- [ ] Pass `startFreeVote` and `hasTickets` through `FloatingAdminPanel.tsx` -> `AdminControls.tsx`
- [ ] Wire up in `RoomPage.tsx`
- [ ] Update `TicketPanel.tsx` — when current ticket has empty content, show minimal UI (just status badge, no description area)

**Backend files:** `ppback/hub/hub.go`
**Frontend files:** `ppfront/src/hooks/useRoom.ts`, `ppfront/src/context/RoomContext.tsx`, `ppfront/src/components/AdminControls.tsx`, `ppfront/src/components/FloatingAdminPanel.tsx`, `ppfront/src/pages/RoomPage.tsx`, `ppfront/src/components/TicketPanel.tsx`

---

## Task 6: Keyboard Shortcuts for Players
- [ ] Create `ppfront/src/hooks/useKeyboardShortcuts.ts`
- [ ] Input buffer with 500ms debounce for multi-char values (e.g., "13", "XXL")
- [ ] Immediate-match optimization: if buffer uniquely matches one value and no other value starts with same prefix, fire immediately
- [ ] Case-insensitive matching against current scale values
- [ ] Skip when focus is in `<input>`, `<textarea>`, or `[contenteditable]`
- [ ] Skip when modifier keys (Ctrl/Alt/Meta) are held
- [ ] Admin-only shortcuts: `Enter` -> reveal, `Space` -> reset, `ArrowLeft`/`ArrowRight` -> prev/next ticket
- [ ] Integrate hook in `RoomPageContent` component
- [ ] `preventDefault()` on Enter/Space to avoid scrolling

**New file:** `ppfront/src/hooks/useKeyboardShortcuts.ts`
**Modified:** `ppfront/src/pages/RoomPage.tsx`

---

## Verification

1. **Theme**: Toggle between System/Dark/Light — all colors update, choice persists across page reload, no flash on load
2. **Contrast**: Admin panel buttons clearly visible, skipped badge distinguishable from pending
3. **Sidebar**: Add 20+ tickets or users, scroll main content — sidebar stays pinned on screen
4. **No ticket mode**: Create room, don't add tickets, click "Start Voting" — vote cards appear, reveal/reset cycle works
5. **Keyboard shortcuts**: In voting state, type "5" -> votes "5", type "13" quickly -> votes "13", type "xxl" -> votes "XXL". Admin: Enter reveals, Space resets, arrows navigate tickets. Verify shortcuts don't fire when typing in ticket form
6. **Run existing tests**: `cd ppfront && npx vitest run`
7. **Build check**: `cd ppfront && npx vite build`
