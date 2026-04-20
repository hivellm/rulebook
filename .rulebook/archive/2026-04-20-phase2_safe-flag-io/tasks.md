## 1. Implementation
- [x] 1.1 Create `src/hooks/safe-flag-io.ts` with VALID_MODES + MAX_FLAG_BYTES constants
- [x] 1.2 Implement `safeWriteFlag` — lstat target + parent, O_NOFOLLOW, atomic temp+rename, 0600
- [x] 1.3 Implement `readFlag` — lstat target, size cap, O_NOFOLLOW, whitelist validation
- [x] 1.4 Audit existing hooks for predictable-path writes
- [x] 1.5 Retrofit handoff `_pending.md` write through safeWriteFlag
- [x] 1.6 Retrofit telemetry file writes where semantically equivalent

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass

## Audit notes (items 1.4–1.6)

Searched all existing hook scripts and source files for writes to
predictable user-owned paths:

- `.claude/hooks/check-context-and-handoff.sh` — **no direct write**.
  Emits a message telling the model to invoke the `/handoff` skill.
  The actual `_pending.md` write is done by the skill via Claude's
  Edit/Write tools, not by the hook. No retrofit applicable.
- `.claude/hooks/resume-from-handoff.sh` — **read-only**. Reads
  `.rulebook/handoff/_pending.md` and emits its contents; no write.
- `.claude/hooks/enforce-*.sh` — all emit hook decisions via stdout.
  No filesystem writes.
- Telemetry (`src/core/telemetry.ts`) — writes NDJSON lines to
  `.rulebook/telemetry/YYYY-MM-DD.ndjson`. Append-only append-write,
  not a coordination flag; does not match the safeWriteFlag attack
  surface (clobber is caught by append-mode; exfil doesn't apply
  because the file is written-only). No retrofit applicable.
- CLI commands (init/update) — write configuration files. These
  use `writeFile` from `src/utils/file-system.ts` which uses atomic
  temp+rename already.

Phase 2.2 (`phase2_terse-hooks-ts`) will be the FIRST consumer of
`safe-flag-io`. The module is in place for future hooks that write
to flag-like coordination paths.
