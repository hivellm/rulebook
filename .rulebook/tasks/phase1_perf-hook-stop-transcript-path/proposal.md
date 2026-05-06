# Proposal: phase1_perf-hook-stop-transcript-path

Source: hivellm/rulebook#15

## Why

The Stop hook `templates/hooks/check-context-and-handoff.sh` currently uses
`find "$HOME/.claude/projects" -name "*.jsonl" -printf '%T@ %p\n' | sort -rn | head -1`
to locate the active session transcript. On Windows (Git Bash) with ~600
historical JSONL files this costs **~853 ms per turn**, growing linearly with
session count. It is the single biggest hook latency in a real Cortex session.

Beyond latency, the strategy is also functionally wrong: it picks the most
recently modified JSONL **globally**, not the JSONL of the current session, so
in concurrent sessions the hook can read another session's transcript and emit
a misleading context-percentage warning.

Claude Code already passes `transcript_path` in the Stop hook stdin payload
(per Anthropic's hook docs). Reading it directly eliminates the traversal and
fixes the cross-session bug.

## What Changes

- Replace the `find … | sort -rn | head -1` block in
  `templates/hooks/check-context-and-handoff.sh` with a single jq read of
  `.transcript_path` from the hook input, then `stat` that exact file.
- Mirror the change in `.claude/hooks/check-context-and-handoff.sh` (the
  installed copy used by this repo's own session).
- Keep the existing fallback (`transcript_size=0` → no-op) for the case where
  the payload does not include `transcript_path`.

## Impact

- Affected specs: none (behavior preserved, only the source of `transcript_size` changes).
- Affected code:
  - `templates/hooks/check-context-and-handoff.sh`
  - `.claude/hooks/check-context-and-handoff.sh`
- Breaking change: NO.
- User benefit: ~800 ms saved per turn; correct estimate in concurrent sessions.
