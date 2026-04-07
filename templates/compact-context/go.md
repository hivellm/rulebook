# Post-compaction cheat sheet (Go project)

Re-injected after every compaction. Keep ≤50 lines. Edit freely.

## Critical reminders

- Read `AGENTS.md` and `AGENTS.override.md` before changes.
- `go vet ./...` before `go test ./...`.
- `gofmt -s -w .` on every file you touch.
- `context.Context` as first parameter for I/O or blocking functions.
- Edit files sequentially, not in parallel.
- If a fix fails twice, stop and escalate.

## Build & test quick reference

- **Build**: `go build ./...`
- **Vet**: `go vet ./...`
- **Test**: `go test -race ./...`
- **Format**: `gofmt -s -w .` and `goimports -w .`
- **Mod tidy**: `go mod tidy` after adding imports

## Forbidden

- No `_ = err` — handle or wrap every error.
- No vendored `/vendor/` unless project explicitly vendors.
- No new modules without authorization.
