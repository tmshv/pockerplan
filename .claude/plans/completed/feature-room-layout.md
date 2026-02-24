# Change room page to grid layout: article (3fr) | sidebar (1fr)

## Context

The room page currently uses `display: flex` with a fixed 320px sidebar. The user wants a full-width grid layout with `3fr | 1fr` proportions, where the article area scrolls independently.

## Files to modify

- `ppfront/src/App.css` — lines 156–194 (room page layout section)
- `ppfront/src/index.css` — line 28 (`body` has `place-items: center` which centers the page)

## Changes

### Task 1: Remove centering from body for room page
- [x] In `index.css` line 28, remove `place-items: center` from `body` (this centers the entire `#root` vertically, preventing full-height layout)

### Task 2: Make `#root` fill the viewport
- [x] In `App.css`, update `#root` to use `min-height: 100vh` so the room page can stretch full height

### Task 3: Update `.room-page` to use CSS grid
- [x] Change `.room-page` to be a full-height grid container that owns the header + main layout
- [x] Make `.room-page` fill available height with `flex: 1` (since `.page` is a flex column)

### Task 4: Convert `.room-layout` from flex to grid
- [x] Replace `display: flex` with `display: grid`
- [x] Set `grid-template-columns: 3fr 1fr`
- [x] Keep `gap: 2rem`
- [x] Add `overflow: hidden` to prevent double scrollbars
- [x] Set `min-height: 0` to allow grid children to scroll

### Task 5: Make `.room-main` scroll independently
- [x] Add `overflow-y: auto` to `.room-main`
- [x] Add `min-height: 0` for proper grid scroll behavior

### Task 6: Update `.room-sidebar`
- [x] Remove `width: 320px` and `flex-shrink: 0` (grid handles sizing now)
- [x] Keep `overflow-y: auto` for sidebar scrolling
- [x] Remove `position: sticky` and `top: 2rem` (grid cells handle positioning)
- [x] Add `min-height: 0` for proper grid scroll behavior

## Resulting CSS (approximate)

```css
#root {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.room-page {
  align-items: stretch;
  flex: 1;
}

.room-layout {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 2rem;
  flex: 1;
  min-height: 0;
}

.room-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  min-height: 0;
}

.room-sidebar {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 0;
}
```

## Verification

- Run `npm run dev` in `ppfront/` and open a room page
- Confirm the layout shows article (left, 3fr) | sidebar (right, 1fr)
- Confirm the article area scrolls independently when content overflows
- Confirm the sidebar scrolls independently when content overflows
- Confirm the home page still looks correct (centered)
- Resize browser to confirm layout stays proportional
