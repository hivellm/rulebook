# Proposal: phase1_orchestrator-directive

## Why
Up to v7.3 the generated rules told the model that orchestration was its own choice ("never blocked, never mandated"). In practice the main session drifted into doing the work itself, burning its context on file reads, and expensive models were spent on simple edits. v7.4 makes the main session a pure orchestrator: it delegates every task to a subagent, routes each subagent to the right model, monitors progress, and keeps the record. The generated rules must say so, or no project running `rulebook update` picks up the change.

## What Changes
- `templates/core/claude-md.md`: the `## Orchestration` section becomes a compact orchestrator directive (delegate everything, model routing, one subagent per task, read reports not files, subagents archive their task, main session monitors/pauses/restarts and updates the CHANGELOG) pointing at `.rulebook/specs/orchestration.md`.
- `templates/core/agents-lean.md`: rule 9 carries the same directive in condensed form; the specs index lists `orchestration.md`.
- New `templates/core/orchestration.md` (wrapped in `ORCHESTRATION:START/END`): the full protocol — main-session role, model routing table (Fable 5.1 / Opus 5.5 / Haiku 4.5), delegation rules, subagent contract, monitoring duties, close-out.
- `generateModularAgents` writes `.rulebook/specs/orchestration.md` unconditionally, like `prohibitions.md`.
- This repo's own `CLAUDE.md` and `.rulebook/specs/orchestration.md` regenerated to match; README "Multi-Agent Workflows" describes the v7.4 orchestrator model.
- Directive-guard tests assert the key clauses survive into generated output.

## Impact
- Affected specs: orchestration (new)
- Affected code: src/core/generators/generator.ts, templates/core/claude-md.md, templates/core/agents-lean.md, templates/core/orchestration.md, tests/directive-guards.test.ts
- Breaking change: NO (rules text only; existing projects pick it up on `rulebook update`)
- User benefit: the main session keeps its context for coordination, cheap work goes to cheaper models, and every task is driven to archive with a changelog record.
