# 04 — Execution Plan

Small enough to ride with phase 5 (or a standalone `phase5a_session-hygiene`
task). All items are additive, zero hooks, zero new subsystems.

## Items

1. **contextTip in v7 tool responses** — `rulebook_task` archive and
   `rulebook_session` end responses include a one-line `contextTip` field
   (R1). Test: response JSON contains the field.
2. **Statusline context meter** — `STATUS_LINE_COMMAND` in
   claude-settings-manager reads stdin JSON and appends ` | ctx NN%` when
   `context_window.used_percentage` is present (R2). Portable sh + node -e
   fallback; degrade to current output when absent. Test: feed fixture JSON,
   assert rendering.
3. **CLAUDE.md guidance line** — add the compact/clear boundary line to
   `templates/core/claude-md.md` (R3, ~25 tokens; budget test still ≤1,600).
4. **Cold-resume acceptance check** — phase-5 CI asserts
   `rulebook_session start` payload includes plans + tasks + learnings keys
   (R4).
5. **Docs** — a short "Session hygiene" section in the migration guide:
   compact at ~60% at boundaries, /clear after archive, why fresh v7 sessions
   cost ~1.7k tokens.

## Non-goals (recorded so they stay dead)

Threshold Stop-hooks, forced handoff files, auto-/clear, background
summarizer models, post-compaction auto-re-reads.
