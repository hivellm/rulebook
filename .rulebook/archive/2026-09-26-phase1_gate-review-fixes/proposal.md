# Proposal: phase1_gate-review-fixes

## Why
An independent review of the uncommitted v7.4.0 Jev entry gate and TypeSafe-on-by-default
work, plus a live `rulebook update` on this repo, found eleven defects: `rulebook update`
drops `integrations` and resets `installedAt`; TypeSafe setup runs (and persists
`enabled:true`, shelling out to `claude plugin`) when Claude Code is absent; `rulebook_gate`
creates `.rulebook/` in a project that has none; the CLAUDE.md routing line lost
"refactors"; the 8 KB hard cap on the gate state is not enforced; Jev choice answers are not
validated; the spec omits one post-rule; three tests/comments are imprecise; `--check` reads
`.env` before honouring `RULEBOOK_GATE=off`; and an inline `.env` comment leaks into the key.

## What Changes
- A. `update.ts`: the config rebuild moves into a pure `rebuildConfigOnUpdate()` that carries
  `installedAt` forward and merges `integrations` from a fresh read taken after the TypeSafe
  decision.
- B. `init.ts` / `update.ts`: the TypeSafe block runs only when Claude Code is detected;
  otherwise one gray "TypeSafe skipped: Claude Code not detected" line and nothing persisted.
- C. `rulebook_gate` passes no config when `.rulebook/rulebook.json` is absent.
- D. CLAUDE.md template + this repo's CLAUDE.md: "Opus 5.5 edits, tests, docs, refactors",
  paid for with a 2-token trim; context budget stays ≤ 1600.
- E. `gate.ts`: after the trims, byte-slice the prompt (UTF-8 safe) until the state fits 8 KB.
- F. `gate.ts` / `client.ts`: a choice outside the question's criteria is undecided; a
  non-string `choice` is a bad response.
- G. Orchestration spec (template + `.rulebook/specs/`): the fourth follow-on rule.
- H–K: tiktoken count in the TypeSafe rule test; `--check` checks `RULEBOOK_GATE=off` before
  reading `.env`; budget comment records 4869/4900; unquoted `.env` values drop ` # comment`.

## Impact
- Affected specs: orchestration (template + `.rulebook/specs/orchestration.md`), gate
- Affected code: src/cli/commands/update.ts, init.ts, gate.ts; src/core/typesafe/gate.ts,
  client.ts; src/mcp/tools/v7-tools.ts; templates/core/claude-md.md, orchestration.md; CLAUDE.md
- Breaking change: NO
- User benefit: updates keep the stored TypeSafe decision and install date; no TypeSafe side
  effects without Claude Code; the gate never scaffolds an unmanaged project; stricter,
  spec-accurate gate behaviour.
