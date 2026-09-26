# 07 — Architect Decisions

Decisions from the Fable synthesis. "Semver" is the release class the change forces; "none" means it can ride in any release. Removals of CLI flags and config keys are classed minor because `migrateConfig` handles existing files and the flags did nothing.

## Decision table

| Item | Findings | Decision | Reason | Semver |
|---|---|---|---|---|
| CLI mirrors of MCP tools | F-016 | **Keep** both; MCP becomes the superset, CLI becomes thin | Hooks, CI and humans need a CLI; agents need MCP. Drift is the problem, not duplication | none |
| Deprecated `tasks` command | F-014 | **Remove** | Deprecated since v6, untested, undocumented | minor |
| `mode` / `agentsMode` / `lightMode` | F-002 | **Merge** into `mode: minimal\|lean\|full` with auto-migration; **defer** to Phase 3 | `mode` is still read; three switches for one concept | minor |
| Feature flags | F-010 | **Remove** entirely, including `config --feature` | Zero behavioural reads | minor |
| Unread config fields | F-011 | **Remove** `timeouts`, `maxParallelTasks`, `outputLanguage`, `cliTools`; keep `updatedAt` | Written, never read | minor |
| `custom-templates.ts` | F-012 | **Remove** | Zero references, not exported | none |
| Dead deps (6 + 3 `@types`) | F-009 | **Remove** | Zero importers | none |
| MCP server config loader | F-017 | **Merge** into `ConfigManager` | Only loader that skips migration | none |
| Writers per artifact | F-018 | **Merge** to one writer per file | Divergent merge rules | none |
| init / update pipelines | F-019, F-029 | **Merge** into `applyRulebook`; **defer** to Phase 3 with an ADR | Every fix made twice today | none |
| Report-style docs | F-028 | **Move** to `docs/archive/` | History kept, top level readable | none |
| Language hook duplication | F-023 | **Keep** | User-visible shell is worth more than ~400 shared lines | none |
| Language skills without detector | F-021, Q2 | **Keep** as opt-in | Zero runtime cost | none |
| Agents / workflows | F-003, F-024 | **Keep** templates; refresh-if-present on update; explicit `claude setup --agents --workflows` | Unreachable and rotting today; deletion is Q1 | none |
| `.claude/commands` vs `.claude/skills` | F-006, F-020 | **Remove** the commands installer; skills only | Source directory does not exist | none |
| CI generator branches | F-008 | **Replace** with a name-driven copy | Reaches more templates with less code | none |
| Detector language set | F-022 | **Add** csharp, kotlin, php, swift, elixir | Assets already exist for all five | none |
| Settings opt-out | F-007 | **Defer** until a user asks (Q5) | Opinionated setup is the value | none |
| Wording tests in `generator.test.ts` | F-025 | **Convert** non-safety checks to structural | Stop failing on harmless rewording | none |
| `v6-cleanup.ts` | — | **Keep** until v8 | Still the only path off v6 layouts | — |

## Frozen — do not touch

- Directive-guard test pins (worktree / `.git` safety, the git safety list).
- The task, decision and skill flows shipped in 7.2–7.4: `rulebook_task ask/answer`, learn → skill promotion, the GitHub task backend.
- The 1600-token budget and its test (`context-budget.test.ts`).
- `templates/core/*` wording — every word is budgeted.
- The v7.4 model-routing rule text.
- `v6-cleanup.ts`, until v8 drops v6 support.

## Irreversible choices

- Removing config keys (F-010, F-011) can be undone only through `migrateConfig`. Keep that migration step for one major version.
- Deleting templates (Q1, Q2) is reversible in git but not for users who already ran `update`. Prefer "make reachable" over "delete".
