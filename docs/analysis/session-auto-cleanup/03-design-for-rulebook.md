# 03 — Design for Rulebook v7: Boundary Hygiene, Not Forced Rituals

Constraints from v7 principles: zero hot-path hooks (F-002), no forced
process (P1), state on disk (P5), don't duplicate the harness (P6). The native
pipeline (F-004) already summarizes and pages; Rulebook adds the two things it
can do better than anyone: **make session rotation cheap** and **signal
pressure through free channels**.

## R1 — Context tips in tool responses (zero cost, in-band)

Task/session boundaries are the natural cleanup moments (every tool in the
landscape agrees). Rulebook OWNS those moments — they are MCP tool calls:

- `rulebook_task {action:"archive"}` response gains a `contextTip`:
  *"Task archived and state saved. A fresh session boots in ~1.7k tokens —
  /clear now is the cheapest moment; /compact <focus> if continuing."*
- `rulebook_session {action:"end"}` response: same tip.

No hooks, no latency, no forcing — the model relays it to the user when
relevant. This is the v7-native replacement for the v6 Stop-hook.

## R2 — Statusline context meter (zero hooks — statusline is already a command)

Claude Code passes `context_window.used_percentage` (and
`exceeds_200k_tokens`) to the statusline command's stdin JSON. Upgrade the
generated statusLine to render `dir | branch | ctx NN%`, color-stepped at
60/80%. This is Cline's progress-bar idea at zero cost — the statusline runs
anyway. Caveat: known upstream bug (#13783) reports cumulative rather than
current tokens on some builds — render as approximate and degrade gracefully
when the field is absent.

## R3 — One line of guidance in generated CLAUDE.md (durable, survives compaction)

Add to the lean template's on-demand section (~25 tokens):
*"Long session? Prefer /compact <focus> at a task boundary (~60% context);
after `rulebook_task archive`, /clear is free — state lives in .rulebook/."*
This encodes the industry best practice exactly where it survives compaction.

## R4 — Session-state completeness (already shipped, verify only)

`rulebook_session start` returns plans + active tasks + recent learnings in
one call; archives apply spec deltas; PLANS.md holds the scratchpad. This is
the Memory Bank (F-008) with tooling. Phase-5 acceptance should assert the
start payload is sufficient to resume cold.

## What NOT to do

- **No Stop/UserPromptSubmit threshold hooks** — that was v6 handoff (F-003);
  per-turn spawns for a once-per-session event, and it fought native compact.
- **No forced /clear or blocking** — pressure is signaled, never enforced.
- **No second-model background summarizer** (Aider-style) — duplicates native
  compaction (P6) and adds a moving part.
- **No auto-re-read recovery** after compaction (Codex's cascade, F-005) —
  the model Reads what it needs on demand via microcompaction paths.
