# Proposal: phase6_post-v7-context-optimization

Source: docs/analysis/post-v7-context-optimization/

## Why

The post-v7.0.0 overhead audit (2026-07-14, commit bd61e45) shows three v7
budgets still failing: static tokens 3,352 vs ≤2,500, installed files 29 vs
≤20, Windows MCP init 210 ms vs ≤150 ms. Two of the three are benchmark
artifacts — `measure-overhead.mjs` counts on-demand assets (path-scoped rules,
STATE/PLANS) as always-on — and the one genuine redundancy is 12 slash
commands (`templates/commands/rulebook-*.md`) that duplicate the 5
consolidated MCP tools verb-for-verb. Until fixed, the budgets misreport
reality, the phase5 CI acceptance check (token budget ≤2,500) would be red,
and every install ships 12 files + 426 frontmatter tokens that add zero
capability.

## What Changes

- **Phase A — command prune**: delete the 12 `templates/commands/rulebook-*.md`
  command templates; stop installing them in `init`; extend the `update`
  migration to strip previously installed copies (sentinel-guarded, same
  pattern as the 2ffdcb6 stale-dist cleanup). Expected: files 29→17, static
  −426 tokens.
- **Phase B — root-file dedupe**: verify whether the current Claude Code
  harness auto-loads AGENTS.md alongside CLAUDE.md; then make AGENTS.md a
  thin index referencing CLAUDE.md for the 7 duplicated rules (values,
  git-safety, orchestration), keeping only AGENTS-specific content (task
  format, specs index, language pointer). Expected: −300…−600 tokens.
- **Phase C — language payload single-source**: keep `.claude/rules/<lang>.md`
  (path-scoped, zero always-on cost) as the canonical copy; retire the
  duplicated `.rulebook/specs/<lang>.md` payload and point AGENTS.md at the
  rule file. Applies to typescript now, generalizes to all
  `SUPPORTED_RULE_LANGUAGES`.
- **Phase D — honest benchmark**: split `scripts/measure-overhead.mjs` into
  always-on (CLAUDE.md, override, skills/commands frontmatter, MCP schemas)
  vs on-demand (path-scoped rules, `.rulebook/` specs/state) totals; budget
  always-on against 2,500 and report on-demand separately; assert that
  sentinel-bearing `.claude/rules/*.md` retain `paths:` frontmatter; raise
  the Windows MCP-init budget to 250 ms with a comment (Node spawn + Defender,
  not Rulebook code).
- Each phase re-runs the measurement and appends a ledger row to
  docs/analysis/v7-performance/05-budget-and-metrics.md.

## Impact

- Affected specs: rulebook.md (command surface, budget definitions)
- Affected code: `templates/commands/`, `src/cli/commands/init.ts` (~L512),
  `src/cli/commands/update.ts`, `src/core/generators/generator.ts`
  (generateAgentsContent, lean-AGENTS path ~L1107),
  `src/core/generators/rules-generator.ts` (L186–227),
  `scripts/measure-overhead.mjs`
- Breaking change: NO for the MCP/tool surface; user-visible removal of the
  12 `/rulebook-*` slash commands (MCP tools `rulebook_task`/`rulebook_memory`
  are the documented replacement; noted in migration guide)
- User benefit: every v7 budget passes honestly; default install drops to
  17 files; always-on context ≈1,700–2,000 tokens; no more phantom 852-token
  gap driving unnecessary optimization work
- Coordination: complements pending `phase5_v7-migration-benchmarks` — its CI
  token-budget check (item 1.5) should consume the new always-on total from
  Phase D
