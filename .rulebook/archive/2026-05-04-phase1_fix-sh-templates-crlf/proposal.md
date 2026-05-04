# Proposal: phase1_fix-sh-templates-crlf

## Why

`@hivehub/rulebook@5.5.1` ships shell-script templates with CRLF (`\r\n`) line terminators. On macOS/Linux, bash interprets the trailing `\r` as part of each command, so every CRLF hook fails immediately:

```
.claude/hooks/terse-activate.sh: line 21: set: -: invalid option
.claude/hooks/terse-activate.sh: line 49: syntax error near unexpected token `{'
```

Because `terse-activate.sh` (SessionStart), `terse-mode-tracker.sh` (UserPromptSubmit), and `check-context-and-handoff.sh` (Stop) are all wired to events that fire on every turn, **Claude Code becomes completely unresponsive in any project initialized by `rulebook init` on a non-Windows host**. Severity: critical — bug report from user (macOS 15.5, arm64) shows 14 transcript entries, 3 user messages, **0 assistant responses**.

The repository's `.gitattributes` already declares `*.sh text eol=lf`, but 12 `.sh` files in `templates/` are physically stored with CRLF — they were added or edited on Windows after the rule was set and never re-normalized. Affected templates:

- `templates/hooks/`: `terse-activate.sh`, `terse-mode-tracker.sh`, `resume-from-handoff.sh`, `on-compact-reinject.sh`, `check-context-and-handoff.sh`, `enforce-team-for-background-agents.sh`
- `templates/ralph/`: `ralph-history.sh`, `ralph-init.sh`, `ralph-pause.sh`, `ralph-run.sh`, `ralph-status.sh`
- `templates/skills/workflows/ralph/install.sh`

Three other hooks in the same directory (`enforce-no-deferred.sh`, `enforce-no-shortcuts.sh`, `enforce-mcp-for-tasks.sh`) are LF-only and work, confirming the issue is per-file (template authoring), not a global write routine.

## What Changes

1. **Re-normalize the 12 affected `.sh` templates** in `templates/` to LF-only, byte-for-byte preserving content otherwise.
2. **Add defense-in-depth in `src/cli/commands/init.ts`** so any `.sh`/`.bash` file written during `rulebook init` is normalized to LF regardless of how it was stored on disk. This protects future regressions when a contributor edits a template on Windows without honoring `.gitattributes`.
3. **Add a CI guard** that fails the build if any `.sh` file in `templates/` (or anywhere else covered by `*.sh eol=lf`) contains `\r`. Matches the existing `.gitattributes` contract.
4. **Add a regression test** that runs `init` into a temp directory and asserts every emitted `.sh` file contains zero `\r` bytes.

## Impact

- Affected specs: none — this is a packaging/scaffolding bug, not a behavior spec change.
- Affected code:
  - 12 files under `templates/` (re-normalized)
  - `src/cli/commands/init.ts` (defensive normalization in the `.sh` write path)
  - `tests/init-command.test.ts` (regression test)
  - new CI step (or extension of existing lint job) to grep for `\r` in `*.sh`
- Breaking change: **NO** — output is functionally identical on Windows (bash/git-bash tolerate LF), and previously-broken on macOS/Linux now works.
- User benefit: `rulebook init` produces a working Claude Code session on macOS/Linux out of the box. Eliminates the silent-failure mode where Claude Code appears hung with no error surfaced to the user.
