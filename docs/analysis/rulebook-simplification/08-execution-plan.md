# 08 — Execution Plan

Four phases in dependency order. Task names are `rulebook_task` candidates. Effort: S < half a day, M ≈ a day, L = several days.

**Model routing** (v7.4 rule): Opus edits code, tests and docs; Fable designs and reviews anything that deletes user files, changes config migration, or restructures the pipeline; Haiku does research sweeps.

## Phase 1 — Correctness (patch 7.4.1)

| Task | Closes | Effort | Routing | Group |
|---|---|---|---|---|
| `phase1_installed-at-carry-forward` | F-001 | S | Opus | A |
| `phase1_claude-md-backup-dedupe` | F-005 | S | Opus | A |
| `phase1_stale-spec-cleanup` | F-004 | S | Opus edit, Fable review (deletes files) | A |
| `phase1_remove-commands-installer` | F-006, F-020 | S | Opus | B |
| `phase1_agents-workflows-refresh` | F-003 | M | Opus edit, Fable review | B, after commands-installer |
| `phase1_update-lifecycle-tests` | F-015, F-027 | M | Opus | after A and B |

Group A touches separate files and runs in parallel. Group B is sequential (both edit `claude-mcp.ts`). Tests come last.

## Phase 2 — Removals (minor 7.5.0)

| Task | Closes | Effort | Routing | Group |
|---|---|---|---|---|
| `phase2_drop-dead-deps` | F-009 | S | Opus | C |
| `phase2_delete-custom-templates` | F-012 | S | Opus | C |
| `phase2_remove-tasks-command` | F-014 | S | Opus | C |
| `phase2_dead-export-sweep` | F-013 | S | Haiku research → Opus edit | C |
| `phase2_table-driven-ci-and-five-languages` | F-008, F-022 | M | Opus edit, Fable review of detector precedence | C |
| `phase2_docs-archive` | F-028 | S | Opus | C |
| `phase2_remove-feature-flags-and-unread-fields` | F-010, F-011 | M | Opus edit, Fable review of `migrateConfig` | D |
| `phase2_mcp-server-uses-config-manager` | F-017 | S | Opus | D, after the above |

Group C runs fully in parallel. Group D is sequential (both edit `config-manager.ts`). The changelog must list the removed CLI surface: `config --feature`, `tasks`.

Depends on Q3 (flags now or v8). If Q6 is accepted as recommended, removing `check-deps` and `rules add/project` and testing `check-coverage` has no task yet; it fits group C. Removing `rules add` also makes `installRule` dead (F-013).

## Phase 3 — Consolidation (minor 7.6.0)

| Task | Closes | Effort | Routing | Order |
|---|---|---|---|---|
| `phase3_single-writer-per-artifact` | F-018 | M | Opus edit, Fable review | 1 |
| `phase3_mode-field-merge` | F-002 | S | Opus | 1 (parallel) |
| `phase3_mcp-superset-thin-cli` | F-016 | M | Opus | 1 (parallel) |
| `phase3_init-update-shared-pipeline` | F-019, F-029 | L | Fable design (ADR `docs/decisions/0001-lifecycle-pipeline.md`) → Opus edit → Fable review | 2, after writers |

Writers first (small, reversible); the pipeline then consumes them. Depends on Q4 (7.6 vs v8).

## Phase 4 — Tests and slimming (any release)

| Task | Closes | Effort | Routing |
|---|---|---|---|
| `phase4_generator-tests-structural` | F-025 | M | Opus |
| `phase4_windows-test-coverage` | F-026 | M | Opus |
| `phase4_settings-opt-out` (only if Q5 = yes) | F-007 | S | Opus |

All independent; all parallel.

## Findings with no task

| Finding | Why |
|---|---|
| F-021 | Informational; weight is cut through F-003 and F-008 |
| F-023 | Decision is keep |
| F-024 | Decision is keep; agents/workflows follow Q1 |

## Size and safety

Phases 1 + 2 remove ~900 lines of `src/` and ~30 docs while adding ~150. Phase 3 removes ~500 more. No change touches the 1600-token budget; run `context-budget.test.ts` after every phase anyway.
