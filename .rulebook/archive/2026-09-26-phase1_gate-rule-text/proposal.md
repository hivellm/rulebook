# Proposal: phase1_gate-rule-text

## Why
v7.4 adds an MCP entry gate (`rulebook_gate`) that sends every operator prompt to
Jev (TypeSafe's System One model) so the main session stops guessing the request
kind, task, model, subagent type, skill, parallelism and risk. The gate only helps
if the always-loaded rules tell the main session to call it first and the
orchestration spec says what to do with each routing field — including when Jev is
unavailable or undecided. The CLAUDE.md file budget (1600 tokens) has 2 tokens of
headroom, so the new sentence must be paid for by trims that drop no rule.

## What Changes
- `templates/core/claude-md.md`: first sentence of `## Orchestration` becomes
  "Gate first: every operator prompt → `rulebook_gate {prompt}` (Jev); act on
  `routing`; unavailable or undecided → these rules." Eleven wording trims (design
  §6) keep the generated always-loaded total ≤ 1600 tokens; no rule is removed.
- `templates/core/orchestration.md`: new `## 3. Entry gate (Jev)` section (what the
  gate receives, the 11 decisions and their thresholds, how the main session acts
  on `routing`, fallback, one call per operator prompt, subagents do not call the
  gate, decision log). Later sections renumber 4–7.
- Repo copies regenerated: `CLAUDE.md`, `.rulebook/specs/orchestration.md`
  (lean `AGENTS.md` unchanged by design).
- `tests/directive-guards.test.ts`: new `entry gate (v7.4)` block.

## Impact
- Affected specs: orchestration (entry gate protocol)
- Affected code: templates/core/claude-md.md, templates/core/orchestration.md,
  tests/directive-guards.test.ts; generated CLAUDE.md and .rulebook/specs/orchestration.md
- Breaking change: NO (the gate is advisory; unavailable → existing rules)
- User benefit: routing decisions come from one cheap model call instead of the
  main session's guess, with a documented fallback when no key is configured.
