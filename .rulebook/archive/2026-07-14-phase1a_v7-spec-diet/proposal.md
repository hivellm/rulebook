# Proposal: phase1a_v7-spec-diet

Source: docs/analysis/v7-performance/

## Why

The on-demand spec layer is bloated: `.rulebook/specs/` for a default project is
~30k tokens, dominated by a 51 KB RULEBOOK.md template, 16–18 KB per-language
essays, 27 KB of MCP-module specs, and ceremony specs (AGENT_AUTOMATION,
TOKEN_OPTIMIZATION, MULTI_AGENT) that v7 principles retire (F-005/F-008/F-010).
AGENTS.md tells the model to read RULEBOOK.md before creating any task — that
single read costs ~13k tokens today. User directive: reduce the spec set,
simplify, review templates, remove MCP specs and everything unnecessary.

## What Changes

- RULEBOOK.md template rewritten lean (51 KB → ~3 KB): task format, spec-delta
  format, workflow, validation/archive rules — no essays.
- Emission removed + templates deleted: TOKEN_OPTIMIZATION, AGENT_AUTOMATION,
  MULTI_AGENT (ceremony/tier subsystems), all 9 MCP-module specs
  (templates/modules/*). Module spec plumbing (generateModuleRules/refs,
  Module Rules section) removed; MCP server wiring in .mcp.json is untouched.
- Dead core templates deleted: DAG.md (docs/DAG.md is code-generated),
  KNOWLEDGE.md, DECISIONS.md, DOCUMENTATION_RULES.md (zero src references).
- Language specs unified with the lean path-scoped rule templates: for the 8
  languages with templates/rules/<slug>.md, .rulebook/specs/<LANG>.md now uses
  that lean content (~2 KB) instead of the 16–18 KB essay; other languages keep
  their existing template until individually reviewed.

## Impact

- Affected specs: RULEBOOK.md, TOKEN_OPTIMIZATION.md, AGENT_AUTOMATION.md,
  MULTI_AGENT.md, module specs, language specs
- Affected code: src/core/generators/generator.ts, templates/core/*,
  templates/modules/*, tests
- Breaking change: YES (generated spec set shrinks; migration in phase5)
- User benefit: on-demand spec load drops ~80%; the mandatory pre-task
  RULEBOOK.md read goes from ~13k to ~1k tokens
