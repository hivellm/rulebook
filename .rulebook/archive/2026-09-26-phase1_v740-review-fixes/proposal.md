# Proposal: phase1_v740-review-fixes

## Why
An independent review of v7.4.0 (orchestrator directive + model routing) found
contradictions and leftovers: the orchestration spec made every small fix carry
the full rulebook task cycle while CLAUDE.md says small fixes need no ceremony;
a budget test banned the phrase that is now the rule; the generated MCP
reference still said "Orchestration is entirely your call"; nine skill
templates still route to `sonnet`; and this repo's AGENTS.md drifted from the
lean template.

## What Changes
- `templates/core/orchestration.md` (+ repo copy `.rulebook/specs/orchestration.md`):
  every task is still delegated, but the rulebook task cycle applies only when
  the work has a rulebook task (multi-session / multi-phase); a small fix is a
  brief in, a report out.
- `tests/context-budget.test.ts`: drop the obsolete `Never implement directly` ban.
- `src/core/docs/mcp-reference-generator.ts` (+ repo `.claude/rules/mcp-tool-reference.md`):
  point to the CLAUDE.md Orchestration section instead of "your call".
- `templates/skills/dev/*/SKILL.md`: route sonnet skills to fable / opus;
  `tests/agent-model-routing.test.ts` scans skill templates too.
- `AGENTS.md`: re-synced with `templates/core/agents-lean.md`.
- `templates/core/agents-lean.md` rule 9 names the routing (budget permitting);
  `templates/core/claude-md.md` `rulebook_session` wording nit (budget permitting).

## Impact
- Affected specs: orchestration
- Affected code: src/core/docs/mcp-reference-generator.ts, templates/core/*, templates/skills/dev/*, tests
- Breaking change: NO
- User benefit: generated rules no longer contradict themselves and every model value follows the v7.4 routing
