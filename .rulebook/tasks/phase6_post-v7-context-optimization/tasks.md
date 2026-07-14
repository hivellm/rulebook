## 1. Phase A — prune the redundant command surface
- [ ] 1.1 Delete the 12 `templates/commands/rulebook-*.md` command templates
- [ ] 1.2 Remove their install path from `src/cli/commands/init.ts` (and `skills-manager` if it references them) so fresh installs no longer receive them
- [ ] 1.3 Extend the `rulebook update` migration to strip previously installed `.claude/commands/rulebook-*.md` copies (sentinel-guarded — preserve user-adopted files without the sentinel)
- [ ] 1.4 Re-run `node scripts/measure-overhead.mjs`; confirm installed files ≤20; append ledger row to docs/analysis/v7-performance/05-budget-and-metrics.md

## 2. Phase B — de-duplicate AGENTS.md vs CLAUDE.md
- [ ] 2.1 Verify whether the current Claude Code harness auto-loads AGENTS.md alongside CLAUDE.md (check harness docs/changelog; record the answer in the analysis)
- [ ] 2.2 Rework `generateAgentsContent()` in `src/core/generators/generator.ts` so AGENTS.md keeps only AGENTS-specific content (task format, specs index, language pointer) and references CLAUDE.md for the shared values/git-safety/orchestration rules
- [ ] 2.3 Apply the lean AGENTS.md to this repo via `rulebook update` (self-apply) and re-measure; append ledger row

## 3. Phase C — single source for language rule/spec payload
- [ ] 3.1 Make `.claude/rules/<lang>.md` the canonical payload; retire the duplicated `.rulebook/specs/<lang>.md` body (keep at most a pointer) in the generators for all SUPPORTED_RULE_LANGUAGES
- [ ] 3.2 Point AGENTS.md "Language & Framework Rules" at the rule file instead of the spec copy
- [ ] 3.3 Self-apply to this repo (typescript) and re-measure; append ledger row

## 4. Phase D — honest benchmark
- [ ] 4.1 Split `scripts/measure-overhead.mjs` totals into always-on (CLAUDE.md, override, skills/commands frontmatter, MCP schemas) vs on-demand (path-scoped rules, `.rulebook/` specs/state); budget always-on against 2,500 and report on-demand separately
- [ ] 4.2 Add an assertion that sentinel-bearing `.claude/rules/*.md` retain their `paths:` frontmatter (fail the report if missing)
- [ ] 4.3 Raise the Windows MCP-init budget to 250 ms with an explanatory comment; keep 150 ms for Linux/CI
- [ ] 4.4 Final measurement run: confirm all budgets pass; append the closing ledger row and update docs/analysis/post-v7-context-optimization/README.md status table

## 5. Tail (mandatory — enforced by rulebook)
- [ ] 5.1 Update or create documentation covering the implementation (CHANGELOG, migration note for removed slash commands, analysis README status)
- [ ] 5.2 Write tests covering the new behavior (init no longer installs commands; update strips them; generator emits lean AGENTS.md; measure script classification)
- [ ] 5.3 Run tests and confirm they pass
