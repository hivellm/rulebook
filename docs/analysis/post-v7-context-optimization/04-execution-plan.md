# 04 — Execution plan (proposed, phased)

Small, independent phases; each re-runs `node scripts/measure-overhead.mjs`
and appends a ledger row (here or in
[v7-performance/05-budget-and-metrics.md](../v7-performance/05-budget-and-metrics.md)).

## Phase A — Prune the redundant command surface (highest value/effort)

- Delete the 12 `templates/commands/rulebook-*.md` (or collapse to at most 2
  discovery aids, e.g. one `rulebook` command whose description points at the
  MCP tools). The 5 MCP tools + their schemas already cover every verb
  (F-004/F-008).
- Update `skills-manager` / `init` (`src/cli/commands/init.ts` ~line 512
  installs into `.claude/commands/`) so these are no longer installed; extend
  the `update` migration to strip them from existing installs (same pattern as
  the stale-dist cleanup in `2ffdcb6`).
- Expected: files 29→17 (passes ≤20), static 3,352→~2,926, command/MCP
  duplication gone.
- User-visible: people may have muscle memory for `/rulebook-task-create` —
  document the MCP replacement in the migration notes.

## Phase B — De-duplicate the two root memory files (F-005)

- **Precondition**: verify whether the current Claude Code harness auto-loads
  AGENTS.md alongside CLAUDE.md. If yes → dedupe saves real tokens. If no →
  AGENTS.md is dead weight for `--tools claude-code`-only installs and can be
  omitted entirely for them.
- Approach: make AGENTS.md a thin index that references CLAUDE.md for the
  shared values/git-safety/orchestration rules, keeping only what is genuinely
  AGENTS-specific (task format, specs index, language pointer). Or emit only
  the file the selected harness loads.
- Expected: −300…−600 static tokens depending on approach.
- Key code: `src/core/generators/generator.ts` — `generateAgentsContent()`
  (line 33) and the lean-AGENTS.md path (~line 1107).

## Phase C — Collapse the language rule/spec duplication (F-006)

- Keep one canonical typescript payload. Simplest: `.claude/rules/<lang>.md`
  stays (path-scoped, zero always-on budget) and AGENTS.md points at *it*;
  retire `.rulebook/specs/<lang>.md` — or vice-versa. One source of truth,
  no drift.
- Key code: `src/core/generators/rules-generator.ts` (path-scoped rules,
  `SUPPORTED_RULE_LANGUAGES`, `paths:` frontmatter extraction, lines 186–227).

## Phase D — Fix the benchmark to reflect reality (F-009/F-010)

- Split `scripts/measure-overhead.mjs` output into **always-on** (CLAUDE.md,
  override, skills/commands frontmatter, MCP schemas) vs **on-demand**
  (path-scoped rules, `.rulebook/` specs/state). Budget the always-on total
  against 2,500; report on-demand separately.
- Add an assertion that generated `.claude/rules/*.md` (sentinel present)
  retain their `paths:` frontmatter.
- Changes no shipped bytes — it makes the budget meaningful and stops chasing
  a phantom 852-token gap.
- Verify the CI acceptance check from v7-performance 05 ("fail CI if
  > 2,500"): if it is wired, the build is currently red at 3,352 and Phases
  A/D are required, not optional.

## Explicitly not worth doing

- **Further MCP schema trimming (F-007)** — ~60–120 tokens at the cost of
  tool-selection ambiguity.
- **Chasing the 210–230 ms Windows MCP init (F-003)** — Node spawn + AV
  overhead, not Rulebook code; passes on Linux. Raise the Windows budget to
  250 ms instead.

## Expected end state

| Metric | Now | After A–D |
|---|---:|---:|
| Always-on tokens | 3,352 (miscounted) | ~1,700–2,000 (honest) |
| Installed files | 29 | 17 |
| MCP tools / bytes | 5 / 3,592 B | unchanged |
| Budgets failing | 3 | 0 (Win init re-budgeted) |
