# Plan: 5 Tasks for pockerplan

## Context

pockerplan is a real-time Planning Poker app (Go backend + React frontend, single binary via `go:embed`). The user reported 5 issues/improvements to address.

## Implementation Order

Tasks 4 and 5 both modify `main.go`, so they are done together. Task 2 (README) is written last to include `--addr` flag docs. Task 3 (Biome) produces a large formatting diff, so it's done before Task 1 to avoid rebasing frontend fixes on reformatted code.

---

## Task 1: Fix room freeze

**Problem**: When opening a room, the UI sometimes shows "Connecting..." forever. Root causes:
- No timeout on WebSocket subscription -- if connection stalls, `loading` stays `true` forever (`useRoom.ts:50`)
- No connection-level error handlers on the Centrifuge client
- Race condition between two independent `useEffect` hooks in `RoomPage.tsx`

### Steps:
- [x] Add `"timeout"` to `RoomErrorType` in `useRoom.ts`
- [x] Add 10s timeout timer in the `useEffect` -- if `subscribed` hasn't fired, set timeout error
- [x] Add client-level `disconnected`/`connecting`/`connected` event handlers in `useRoom.ts` to surface connection errors and clear them on reconnect
- [x] Clear timeout in cleanup function
- [x] Merge two `useEffect` hooks in `RoomPage.tsx` into one (admin secret save + redirect check atomically)
- [x] Add timeout error UI in `RoomPageContent` with a reload button

**Files**: `ppfront/src/hooks/useRoom.ts`, `ppfront/src/pages/RoomPage.tsx`

---

## Task 2: README in Russian

**Problem**: README is just `# pockerplan`.

### Steps:
- [ ] Write README.md with Russian description: what it does, features, tech stack, build/run/dev/test commands, `--addr` flag docs

**Files**: `README.md`

---

## Task 3: Replace ESLint with Biome

**Problem**: User wants Biome for linting and formatting instead of ESLint.

### Steps:
- [ ] Remove ESLint devDependencies from `package.json`: `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `typescript-eslint`
- [ ] Delete `ppfront/eslint.config.js`
- [ ] Install `@biomejs/biome` as exact devDependency
- [ ] Create `ppfront/biome.json` with recommended rules + `useExhaustiveDependencies` (warn) + `useHookAtTopLevel` (error)
- [ ] Update `package.json` scripts: `lint` -> `biome check .`, add `format` -> `biome format --write .`
- [ ] Remove `// eslint-disable-next-line` comment in `RoomContext.tsx:17`
- [ ] Run `biome check --fix .` and `biome format --write .` to auto-format
- [ ] `rm -rf node_modules && npm install` to clean up

**Files**: `ppfront/package.json`, `ppfront/eslint.config.js` (delete), `ppfront/biome.json` (new), `ppfront/src/context/RoomContext.tsx`, various auto-formatted `.ts/.tsx` files

---

## Task 4: Use zerolog in backend, log each request

**Problem**: Backend uses stdlib `log` with no structured logging and no request logging.

### Steps:
- [ ] `go get github.com/rs/zerolog`
- [ ] Create `zerolog.Logger` in `main.go` with `ConsoleWriter` + timestamp
- [ ] Replace all `log.Printf`/`log.Fatalf`/`log.Println` in `main.go` with zerolog equivalents
- [ ] Add `logger zerolog.Logger` field to `Hub` struct, update `New(rm, logger)` signature
- [ ] Bridge Centrifuge `LogHandler` to zerolog with proper log levels
- [ ] Replace `log.Printf` calls in `hub.go` with `h.logger`
- [ ] Add `logger zerolog.Logger` field to `Server` struct, update `New(h, frontFS, logger)` signature
- [ ] Add `responseWriter` wrapper and `requestLogger` middleware in `server.go` that logs method, path, status, duration, remote addr
- [ ] Wire middleware into `ServeHTTP`
- [ ] Replace `log.Printf` in `server.go` with `s.logger`
- [ ] Pass logger from `main.go` to `hub.New()` and `server.New()`

**Files**: `go.mod`, `main.go`, `ppback/hub/hub.go`, `ppback/server/server.go`

---

## Task 5: Use kong for CLI

**Problem**: No CLI framework, address is read via `os.Getenv("ADDR")` only.

### Steps:
- [ ] `go get github.com/alecthomas/kong`
- [ ] Define `var cli struct { Addr string }` with `default:":8080" env:"ADDR"` tags in `main.go`
- [ ] Call `kong.Parse(&cli)` at top of `main()`
- [ ] Replace `os.Getenv("ADDR")` block with `cli.Addr`

**Files**: `go.mod`, `main.go`

---

## Verification

1. `go build -o bin/pockerplan .` -- compiles successfully
2. `make test` -- all backend and frontend tests pass
3. `./bin/pockerplan --help` -- prints usage with `--addr` flag
4. `./bin/pockerplan` -- starts with structured zerolog output, request logs appear on HTTP calls
5. `cd ppfront && npx biome check .` -- no lint errors
6. Open room in browser -- no freeze, timeout error appears if backend is unreachable
