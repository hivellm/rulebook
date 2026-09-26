# Proposal: phase1_model-routing

## Why
Rulebook's agent definitions and workflow scripts pick models ad hoc: `sonnet` does implementation work, `haiku` writes docs and security reviews, and review phases sit on `opus`. v7.4.0 adopts one explicit routing rule so the expensive model is spent only where judgment matters and simple work never lands on it.

## What Changes
- Routing rule encoded everywhere rulebook names a model for an agent:
  - Fable (`fable`): architecture, complex bugs, code review / verification.
  - Opus (`opus`): edits, tests, documentation, refactoring, build/perf work, orchestration.
  - Haiku (`haiku`): research, discovery, summaries.
- `templates/agents/*.md` frontmatter `model:` updated per agent (architect, code-reviewer, quality-gatekeeper, security-reviewer → fable; build-engineer, implementer, performance-engineer, tester, docs-writer, team-lead → opus; researcher → haiku), with a YAML comment stating the routing.
- `templates/claude-workflows/*.js`: every `sonnet` becomes `opus`; review/critique/verify/design phases become `fable`; documentation phases become `opus`; research/discovery stays `haiku`. Each file gets a header comment stating the routing. Every `agent()` call keeps an explicit `model`.
- This repo's installed copies (`.claude/agents`, `.claude/workflows`) synced.
- New `tests/agent-model-routing.test.ts` pins the routing.

## Impact
- Affected specs: agents (model routing)
- Affected code: templates/agents/*.md, templates/claude-workflows/*.js, .claude/agents/*.md, .claude/workflows/*.js, tests/agent-model-routing.test.ts
- Breaking change: NO (consumers pick up new models on `rulebook update`)
- User benefit: predictable cost/quality trade-off — deep models only on review and architecture, no `sonnet` left in rulebook's agent templates
