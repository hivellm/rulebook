# 02 — Dead Code, Dead Config, Dead Dependencies

Things that are written, installed, or registered but never used.

## F-009 — Six runtime dependencies and three `@types` are never imported

**Evidence**: `blessed`, `chokidar`, `node-notifier`, `uuid`, `ansi-escapes`, `cli-cursor` have zero importers in `src/`, `tests/`, `scripts/` (the one "blessed" hit is prose in `tests/directive-guards.test.ts:23`). `@types/blessed` sits in `dependencies`; `@types/node-notifier` and `@types/uuid` in `devDependencies`. `execa` has one use (`config-manager.ts:319`), `glob` two.
**Impact**: install size (~3 MB), audit surface, and a false signal to readers.
**Confidence**: high.
**Recommendation**: remove the 9 entries from `package.json`. Optionally replace the single `execa` call (`git config`) with `child_process.execFile` (−1 more dep). Not breaking.

## F-010 — Feature flags are written and toggled but never read

**Evidence**: 7 booleans in `types.ts:170-178`; defaults `config-manager.ts:196-203, 599`; migration `:236-252`; `setFeature` / `isFeatureEnabled` / `getSummary` `:299-372`; CLI `config --feature --enable/--disable` `misc.ts:325-332`; `update.ts:475-486` recomputes them. No call site reads `isFeatureEnabled` or `config.features.<x>` to change behaviour.
**Impact**: user-facing (a CLI switch that does nothing) and maintainer.
**Confidence**: high.
**Recommendation**: delete the type, defaults, migration, the three methods, the CLI options and the update block; `migrateConfig` drops the key from existing files. ~150 lines of `src`, ~60 lines of tests (`config-manager.test.ts`, `backward-compatibility.test.ts`). Minor (CLI flags removed). Timing is Q3.

## F-011 — Four config fields are written on every run and never read

**Evidence**: `timeouts.*`, `maxParallelTasks`, `outputLanguage` have only writers (`update.ts:499-506`, `config-manager.ts:207-214, 260-270, 610-617`). `cliTools` is detected (`config-manager.ts:320-341`) and printed once by `doctor` (`misc.ts:322`), never used for behaviour. `updatedAt` is also write-only but cheap and informative.
**Impact**: maintainer; every `rulebook.json` carries 9 dead lines.
**Confidence**: high.
**Recommendation**: remove `timeouts`, `maxParallelTasks`, `outputLanguage`, `cliTools` (`doctor` detects tools live); keep `updatedAt`. ~80 lines of `src` + ~70 lines of tests. Minor (schema; migrated).

## F-012 — `src/core/custom-templates.ts` is entirely dead

**Evidence**: 157 lines, five exports, zero references in `src/`, `tests/`, or package entry points (`main: dist/index.js`, no `exports` map).
**[recon corrected]**: recon 01's "18 references outside the file" is wrong; there are none.
**Impact**: maintainer.
**Confidence**: high.
**Recommendation**: delete the file. Not breaking.

## F-013 — Other suspected dead exports

**Evidence**: recon 01 named `installRule` (`src/core/rule-engine.ts`), `createLogger`, `initializeLogger` (`src/core/logger.ts`). The architect's own grep did not run.
**[recon corrected]**: `substituteAgentPlaceholders` is used (`claude-mcp.ts:254`).
**Write-up check** (grep, not a decision):
- `installRule` (`rule-engine.ts:183`) is live: `rules add` calls it at `src/index.ts:660`. It becomes dead only if Q6 removes `rules add`.
- `logger.ts` (361 lines) has no importer in `src/` at all, not just the two factory functions. `getLogger()` (`logger.ts:355`) throws unless `initializeLogger()` ran, and nothing in `src/` calls either. Only `tests/logger.test.ts` uses the module.
**Impact**: maintainer.
**Confidence**: low in the synthesis; the grep above raises it to high for `logger.ts`.
**Recommendation**: one Haiku pass with `ts-prune`-style export analysis before deleting anything here. Effort S.

## F-014 — The deprecated `tasks` command is still registered

**Evidence**: registration at `src/index.ts:340-353` ("DEPRECATED - use task"), handler `tasksCommand` at `src/cli/commands/task.ts:314`. Untested, not in README. (The synthesis cited `index.ts:340-~400`, ~61 lines; the registration itself is 14 lines, the rest is the handler.)
**Impact**: surface noise.
**Confidence**: high.
**Recommendation**: remove. Minor (deprecated since v6).

## F-015 — Untested CLI commands, and no `update` test

**Evidence**: recon 02 lists `check-deps`, `check-coverage`, `rules add/project`, `workspace add/remove`, `decision supersede`, `knowledge remove`, `tasks` as untested. `tests/` has `init-command.test.ts` and `v6-cleanup.test.ts` but no `update` test at all — which is how F-001, F-003 and F-004 survived.
**Impact**: maintainer; lifecycle regressions ship.
**Confidence**: medium (recon list not re-checked per command; the missing `update` test is verified).
**Recommendation**: add `update-command.test.ts` covering F-001, F-003, F-004, F-005 in Phase 1. Decide per command (Q6) whether to test or delete `check-deps`, `check-coverage`, `rules add/project`.
