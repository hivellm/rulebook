# Proposal: F-NEW-5 — Session handoff & freshness manager (extension-free)

Source: [docs/analysis/v5.3.0/10-session-handoff.md](../../../docs/analysis/v5.3.0/10-session-handoff.md)

## Why
Sessions degrade as context fills (paper §5–6, plus field experience). Ralph already proves the iteration-handoff pattern works. Users need the same continuity at the chat-session level: detect when context is filling, force a structured handoff, and auto-restore on the next session. Constraint: no custom VSCode extension dependency — must work via hooks + skills only. Therefore one residual manual action (`/clear`) is accepted.

## What Changes
- New Stop hook `templates/hooks/check-context-and-handoff.sh` reads `transcript_path`, estimates token usage, and at warn (75%) / force (90%) thresholds emits `additionalContext` instructing the model to invoke `/handoff` and tell the user to type `/clear`.
- New `/handoff` skill `templates/skills/handoff.md` writes `.rulebook/handoff/_pending.md` containing active task, decisions, files touched, next steps, and the resume command. Always ends with the visible `>>> TYPE /clear NOW <<<` line.
- New SessionStart hook `templates/hooks/resume-from-handoff.sh` checks for `_pending.md`, injects its content via `additionalContext` on the new session, and moves the file to `.rulebook/handoff/<timestamp>.md` history.
- New always-on rule `templates/rules/respect-handoff-trigger.md` makes the model treat the handoff trigger as non-negotiable.
- `.rulebook/rulebook.json` gains a `handoff` config block (`enabled`, `warn_threshold_pct`, `force_threshold_pct`, `tokenizer`, `max_history_files`).
- `.rulebook/handoff/` directory and `.gitignore` entry bootstrapped at init.

## Impact
- Affected specs: `templates/hooks/`, `templates/skills/`, `templates/rules/respect-handoff-trigger.md`
- Affected code: `src/core/generator.ts` (init bootstrap), `src/core/config-manager.ts` (handoff section), settings.json wiring for both hooks
- Breaking change: NO (additive; default thresholds conservative)
- User benefit: cross-session context continuity with one keystroke of friction; no extension required; pairs with F-NEW-2 and F3 to complete the session continuity stack
