# Proposal: phase2_audit-mcp-tool-surface

## Why

The Rulebook MCP server (`src/mcp/rulebook-server.ts`) currently exposes
~50 `rulebook_*` tools. Several look like duplicates or experiments that
inflate the agent's tool list without clear payoff:

- `rulebook_analysis_*` (3 tools: create/list/show) — overlaps with
  knowledge + decision management; analyses can be modeled as either.
- `rulebook_evals_*` (2 tools: measure/run) — experimental, no documented
  consumer, no CLI wiring.
- `rulebook_blockers` — orphaned tracker not integrated with the task
  system.
- `rulebook_doctor_run` — duplicates the CLI `doctor` family with no
  unique behavior.
- `rulebook_indexer_status` — only the `status` slice exists; no
  `init` / `run`. Suggests the indexer is unused infrastructure.

A bloated tool list costs context tokens on every Claude Code session
(each tool's schema is loaded), and a confused agent picks the wrong tool.

The right action is an **audit**: confirm each tool's usage from logs,
docs, and tests, then remove the unjustified ones.

## What Changes

- Audit each candidate by:
  - Grepping for callers in tests and skill markdown files.
  - Checking whether any CLI command shells out to the MCP tool.
  - Reviewing memory/decision history for past invocations.
- Produce a removal list with a one-line justification per tool.
- For confirmed removals:
  - Strip the tool registration from `src/mcp/rulebook-server.ts`.
  - Delete the underlying handler module if it is now orphaned
    (`analysis-manager.ts` if nothing else uses it, etc.).
  - Update `RULEBOOK_MCP.md` spec and any agent-facing docs.
- For tools we keep, document the canonical use-case in `RULEBOOK_MCP.md`
  so future audits don't re-trip them.

## Impact

- Affected specs: `RULEBOOK_MCP.md` (tool catalog updated).
- Affected code:
  - Modified: `src/mcp/rulebook-server.ts`
  - Possibly deleted: `src/core/analysis-manager.ts`,
    `src/core/auto-fixer.ts` (if eval/doctor handlers reach into it),
    handler stubs for evals/blockers
  - Tests adjusted to drop coverage of removed tools
- Breaking change: YES for any external script that calls a removed
  tool. Mitigated by deprecation warnings in the previous minor release.
- User benefit: smaller MCP tool list → faster cold starts, less agent
  confusion, fewer schema tokens loaded per session.
