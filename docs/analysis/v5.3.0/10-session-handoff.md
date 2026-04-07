# 10 — Session Handoff & Freshness Manager (extension-free)

**User directive (2026-04-07):** sessions degrade as context fills (validated by published research and observed in Ralph's iteration model). Rulebook must monitor context size, force a handoff before degradation, and auto-restore on the next session — **without depending on a custom VSCode extension**, since the user runs Claude Code inside VSCode but cannot assume rulebook-dashboard is installed.

## Constraint

Claude Code's `/clear` command is a harness command, not a hook-callable API. There is no documented way to programmatically trigger `/clear` from inside a session. Therefore the design accepts **one residual manual action** (the user types `/clear`) and minimizes everything else.

## Components (all shipped via `rulebook init`, no extension required)

### 1. Stop hook — `templates/hooks/check-context-and-handoff.sh`

Runs after every model turn. Steps:
1. Resolve `transcript_path` from the hook input JSON (Claude Code passes it).
2. Estimate token count from the JSONL transcript (line-count + char-based heuristic; tiktoken if available).
3. Compare to threshold (`warn: 75%`, `force: 90%` by default; configurable in `.rulebook/rulebook.json`).
4. When ≥ warn: emit `additionalContext` instructing the model to invoke `/handoff` immediately and instruct the user to type `/clear`.
5. When ≥ force: also write sentinel `.rulebook/handoff/.urgent` so the `/handoff` skill skips confirmations.
6. When < warn: no-op (zero overhead).

The threshold values, transcript-path resolution, and tokenizer choice are encapsulated in the hook script — no MCP roundtrip required.

### 2. `/handoff` skill — `templates/skills/handoff.md`

Instructs the model to write `.rulebook/handoff/_pending.md` containing:
- **Active task** (id + current phase from `.rulebook/STATE.md`)
- **Decisions made this session** (extracted from conversation)
- **Files touched** (with brief reason)
- **Next steps** (concrete, actionable)
- **Exact resume command** for the next session
- **Open questions / blockers**

The skill ends every successful run with the visible message:

> `>>> TYPE /clear NOW — your context will be auto-restored in the next session <<<`

### 3. SessionStart hook — `templates/hooks/resume-from-handoff.sh`

Runs at the start of every Claude Code session.
1. Check for `.rulebook/handoff/_pending.md`.
2. If present: emit its content as `additionalContext` so the new session begins with full prior-session context loaded.
3. Move `_pending.md` → `.rulebook/handoff/<ISO-timestamp>.md` (becomes history).
4. Clear the `.urgent` sentinel if present.

Result: the user types `/clear`, hits Enter, and the new fresh session already has the handoff loaded as if it were the first system message. **Zero copy-paste.**

### 4. Mandatory rule — `templates/rules/respect-handoff-trigger.md`

Always-on rule (no `paths:` frontmatter):

> When you receive `additionalContext` mentioning a handoff trigger, you MUST stop your current task, invoke the `/handoff` skill immediately, and never proceed past the handoff message. The user must type `/clear` before any further work. This rule has the highest precedence after `git-safety.md`.

Pairs with existing `no-shortcuts.md` and `follow-task-sequence.md`. The combined enforcement makes the model treat the handoff as non-negotiable.

### 5. History captured to `.rulebook/handoff/`

Every completed handoff becomes a timestamped file:
- Material for the knowledge base (`rulebook learn capture` can promote notable handoffs).
- Auditable session log: replay how the project evolved across sessions.
- Source for `rulebook continue` when no handoff is pending (falls back to most recent).

## End-to-end UX

```
[model working normally]
[turn ends, Stop hook fires, estimates 82% context]
⚠️  Context at 82%. Saving handoff...
✓  Handoff saved to .rulebook/handoff/_pending.md
>>> TYPE /clear NOW — your context will be auto-restored <<<

[user types /clear]                ← only manual action
[new fresh session starts]
[SessionStart hook injects handoff content]
[model already has full context; continues exactly where it stopped]
```

**Total friction: 1 keystroke (`/clear` + Enter).** Cannot be reduced further without an in-IDE extension running custom code.

## Configuration

`.rulebook/rulebook.json` gains a `handoff` section:

```json
{
  "handoff": {
    "enabled": true,
    "warn_threshold_pct": 75,
    "force_threshold_pct": 90,
    "tokenizer": "auto",
    "max_history_files": 50
  }
}
```

## Honest caveats

- **Token estimation is ±15%.** JSONL doesn't include re-injected system messages or post-hoc tool result truncation. Mitigation: conservative defaults (warn at 75%).
- **Model may ignore the trigger.** Mitigation: strong rule (`respect-handoff-trigger.md`) + repeated `additionalContext` injection on every turn above threshold + the rule is loaded at session start, not on demand.
- **`transcript_path` format may vary across Claude Code versions.** Mitigation: hook script falls back to "most recent JSONL in `~/.claude/projects/`" if direct path fails.
- **User may ignore the `/clear` prompt.** Mitigation: handoff is already saved to `_pending.md`, so the next session — whenever it happens — auto-restores from it. No work lost.
- **No extension means no auto-`/clear`.** This is a hard limitation of Claude Code's architecture. The single keystroke is the cost of the extension-free constraint.

## Why this is P0

Three independent signals converge:
1. **Research:** sessions degrade with context fill (paper §5–6, default-on adoption finding).
2. **Field evidence:** Ralph already implements this pattern at the iteration level — proves the model works.
3. **User pain:** the user explicitly stated this is needed and that the extension constraint is hard.

Combined with F-NEW-2 (`COMPACT_CONTEXT.md`) and F3 (`STATE.md` autoregen), F-NEW-5 completes the **session continuity stack**:

| Layer | Mechanism | Lifetime |
|---|---|---|
| Per-turn state | `STATE.md` (machine) + `PLANS.md` (human) | Within session |
| Post-compaction | `COMPACT_CONTEXT.md` reinject hook | Within session, post-compact |
| **Cross-session** | **`/handoff` skill + `_pending.md` + resume hook** | **Between sessions** |

## v5.3.0 action

See task `phase1_v530-fnew5-session-handoff`.
