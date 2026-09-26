Produced 2026-09-26 under the v7.4 orchestration rule: Haiku surveys → Fable synthesis → Opus write-up; main session reviewed.

# Rulebook Simplification — What to Cut, Merge, and Fix in v7.4

**Date**: 2026-09-26
**Scope**: The whole package — `src/`, CLI and MCP surface, config, templates, tests, docs.
**Branch**: `release/v7.4.0`
**Verdict**: Rulebook's product is small: the always-loaded context (1598 of 1600 tokens), the 6-tool MCP server, and the CLI that installs them. Most weight around it is delivery machinery. Fix four update bugs first, delete what is provably dead, then merge the two copies of the install pipeline.

This analysis was the first run of the v7.4 orchestration rule. Four Haiku surveys ran in parallel, one Fable synthesis re-checked them and corrected nine recon claims, and one Opus pass wrote it up — the main session did none of the work itself, only reviewed it.

## Executive summary

- **Size.** `src/` is 63 files / 19,663 lines. `init.ts` + `update.ts` = 1,475 lines doing the same 11 steps twice.
- **Surface.** 68 CLI commands vs 6 MCP tools. Several actions exist only in the CLI.
- **Bugs.** `update` resets `installedAt`, keeps stale language specs, backs up CLAUDE.md on every run, and never installs or refreshes agents/workflows ([01](01-lifecycle-bugs.md)).
- **Dead weight.** 6 runtime deps + 3 `@types` never imported; 7 feature flags and 4 config fields never read; `custom-templates.ts` unreferenced; the `.claude/commands` installer copies from a directory that does not exist ([02](02-dead-code-config-deps.md)).
- **Duplication.** The MCP server reads `rulebook.json` raw, skipping migration. Several files have 3–4 writers each ([03](03-duplicated-surfaces.md)).
- **Templates.** 183 files / 17,540 lines, but 59 % are opt-in language skills with zero always-loaded cost. The real waste is 29 of 40 CI templates and 10 hook scripts that no detected language can reach ([04](04-template-weight.md)).
- **Tests.** 982 pass, 25 skipped on Windows (the whole MCP server suite among them). No `update` test exists, which is how the bugs survived ([05](05-tests-brittleness.md)).
- **Docs.** 78 files, about 30 of them pre-v7 reports ([06](06-docs-sprawl.md)).

Plan: patch 7.4.1 (bugs), minor 7.5.0 (removals), minor 7.6.0 (shared pipeline), then test work. Phases 1–3 remove ~1,400 lines of `src/` and ~30 docs. The 1600-token budget is not touched ([08](08-execution-plan.md)).

## Files

| File | Theme | Findings |
|---|---|---|
| [01-lifecycle-bugs.md](01-lifecycle-bugs.md) | init/update bugs and unreachable install paths | F-001..F-008 |
| [02-dead-code-config-deps.md](02-dead-code-config-deps.md) | Dead deps, flags, fields, files, commands | F-009..F-015 |
| [03-duplicated-surfaces.md](03-duplicated-surfaces.md) | CLI vs MCP, config loaders, writers, init vs update | F-016..F-020 |
| [04-template-weight.md](04-template-weight.md) | Where template lines sit and what is reachable | F-021..F-024 |
| [05-tests-brittleness.md](05-tests-brittleness.md) | Wording tests, Windows skips, missing tests, silent catches | F-025..F-027, F-029 |
| [06-docs-sprawl.md](06-docs-sprawl.md) | Pre-v7 reports in `docs/` | F-028 |
| [07-architect-decisions.md](07-architect-decisions.md) | Remove / merge / keep / defer, semver, frozen list | — |
| [08-execution-plan.md](08-execution-plan.md) | Phases, tasks, effort, model routing, parallelism | — |

F-029 (silent catch blocks) sits in 05, not 06: it is about hidden failures, not docs.

## Decisions needed

**Q1 — Agents and workflows: refresh-if-present, delete, or install by default?**
- (a) Refresh on update when the directory exists, plus an explicit `claude setup --agents --workflows` opt-in.
- (b) Delete the 17 templates and installers (−1,208 lines; breaks users of `.claude/workflows/*.js`).
- (c) Install by default, since v7.4 mandates subagent delegation (~250 lines per project, zero always-loaded tokens, duplicates native agents).
- **Recommendation: (a).** Revisit (c) after one release of v7.4 routing in the wild.

**Q2 — Languages with no detector (ada, lisp, objectivec, sas, sql, c): keep as opt-in skills or delete?**
- Keep (~2,000 lines, zero runtime cost) or delete (smaller package).
- **Recommendation: keep.** Add the five detectable languages (F-022) and stop there.

**Q3 — Feature flags and unread fields: remove in 7.5 or keep writing no-op keys until v8?**
- Remove now, with `migrateConfig` dropping the keys, or keep until v8 (no risk, more debt).
- **Recommendation: remove in 7.5**; list it in the changelog.

**Q4 — Init/update pipeline refactor: 7.6, or bundle into v8 with a new config schema?**
- 7.6 (the Phase 1 bugs are symptoms of the duplication and will recur) or v8 (one big cut, longer exposure).
- **Recommendation: 7.6, behind an ADR.**

**Q5 — Should `applyClaudeSettings` get an opt-out (`--no-settings`)?**
- Yes (respects hand-managed settings; one flag) or no (rulebook owns settings; simpler).
- **Recommendation: no**, until a user reports a conflict.

**Q6 — Untested commands `check-deps`, `check-coverage`, `rules add/project`: test or remove?**
- Test (~150 lines of tests) or remove. `check-coverage` is documented (README:339); the others are not.
- **Recommendation: remove `check-deps` and `rules add/project` in 7.5; keep and test `check-coverage`.**
