# Proposal: phase2_safe-flag-io

Source: docs/analysis/caveman/06-hook-deep-dive.md

## Why

Flag files for hook coordination sit at predictable user-writable paths. Without precautions they enable two real attacks: (1) clobber — attacker replaces flag with symlink to `~/.ssh/authorized_keys`, next write destroys it; (2) exfil — attacker symlinks to `~/.ssh/id_rsa`, next read slurps the private key and the UserPromptSubmit hook injects it into model context, where subsequent turns can leak it. Caveman's `safeWriteFlag`/`readFlag` primitives close both attack classes. Rulebook's existing hooks (handoff flag, task state) have the same exposure and need the same defenses.

## What Changes

- `src/hooks/safe-flag-io.ts` — shared module exporting `safeWriteFlag(path, content)` and `readFlag(path)`. Invariants: `lstat` target + parent (write side), `O_NOFOLLOW` on open, atomic temp+rename (write), `0600` mode, size cap (`MAX_FLAG_BYTES = 32`), whitelist validation (`VALID_MODES`), silent-fail returning void/null on any anomaly.
- Retrofit existing hooks that write to predictable user-owned paths (handoff `_pending.md`, telemetry ndjson) to use `safeWriteFlag` where semantically equivalent.
- Unit tests: symlink at target refuses, symlink at parent refuses, oversized file rejects, whitelist non-member returns null, concurrent write race doesn't corrupt.

## Impact

- Affected specs: `.rulebook/specs/rulebook-terse/spec.md` (ADDED safety invariants)
- Affected code: `src/hooks/safe-flag-io.ts` (new), retrofits in `.claude/hooks/*`
- Breaking change: NO
- User benefit: Closes two real local-attack surfaces; no user-visible behavior change.
