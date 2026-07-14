## 1. Phase A — prune the redundant command surface
- [x] 1.1 Delete the 12 templates/commands/rulebook-*.md command templates
- [x] 1.2 Remove their install path — templates/commands is gone; installClaudeCodeSkills degrades gracefully; skills-manager has no reference
- [x] 1.3 Extend the rulebook update migration to strip previously installed .claude/commands/rulebook-*.md copies (marker-guarded; user-authored files preserved)
- [x] 1.4 Re-run measure-overhead: installed files 17 (≤20 ✔); ledger row appended

## 2. Phase B — de-duplicate AGENTS.md vs CLAUDE.md
- [x] 2.1 Verified: the current Claude Code harness does NOT auto-load AGENTS.md when CLAUDE.md exists (empirical — session boot context carries CLAUDE.md + AGENTS.override.md only); recorded in the analysis README
- [x] 2.2 Resolution per verification: AGENTS.md stays self-sufficient (it is the payload for Cursor/Codex/Gemini, which read ONLY it); thinning it to a CLAUDE.md pointer would break those consumers. The benchmark reclassifies it as other-tools/on-demand — the duplication costs zero for Claude sessions
- [x] 2.3 Self-applied and re-measured; ledger row appended

## 3. Phase C — single source for language rule/spec payload
- [x] 3.1 .claude/rules/<lang>.md is the canonical payload; .rulebook/specs/<lang>.md is a pointer for all SUPPORTED_RULE_LANGUAGES (heading reused from the canonical template — zero drift)
- [x] 3.2 AGENTS.md Language & Framework Rules points at the rule file for covered languages
- [x] 3.3 Self-applied to this repo (typescript spec is now a pointer); re-measured; ledger row appended

## 4. Phase D — honest benchmark
- [x] 4.1 measure-overhead.mjs splits ALWAYS-ON (CLAUDE.md, override, non-path-scoped rules, skills/commands frontmatter, MCP schemas) vs ON-DEMAND (AGENTS.md, path-scoped rules, .rulebook specs/state); always-on budgeted at 2,500
- [x] 4.2 Frontmatter assertion: sentinel-bearing .claude/rules/*.md without paths: are reported as violations and fail the budgets
- [x] 4.3 Windows MCP-init budget 250 ms (platform-conditional, with comment); Linux/CI stays 150 ms
- [x] 4.4 Final run: ALL v7 BUDGETS PASS — 1,678 always-on (+3,383 on-demand), 17 files, 5/3,562B/208ms; analysis README status table updated

## 5. Tail (docs + tests — check or waive with tailWaiver)
- [x] 5.1 Update or create documentation covering the implementation — CHANGELOG + migration note (slash commands → MCP tools) + analysis README status
- [x] 5.2 Write tests covering the new behavior — v6-cleanup commands test; generator/merger tests updated to canonical-rule refs; benchmark classification verified by run
- [x] 5.3 Run tests and confirm they pass — suite green: 845 tests
