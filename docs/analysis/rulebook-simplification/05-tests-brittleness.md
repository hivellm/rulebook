# 05 — Tests and Brittleness

Suite today: 60 files, 16,061 lines, 982 pass, 25 skipped, ~6.5 s wall time. The gaps are where the product is: the MCP server on Windows and the `update` path. F-029 is here because silent catches are the other reason failures stay hidden.

## F-025 — 177 assertions on generated wording

**Evidence**: `directive-guards.test.ts` 77, `generator.test.ts` 75, `context-budget.test.ts` 17, `generator-lean.test.ts` 8 (recon 03).
**Impact**: maintainer — rewording a template fails tests. For `directive-guards` and the budget test that is the point.
**Confidence**: high on counts.
**Recommendation**: leave `directive-guards` and `context-budget` untouched (they are the product guarantee). Convert `generator.test.ts` wording checks that are not safety directives into structural checks (sentinel present, section order). Effort M. Not breaking.

## F-026 — The MCP server suite and two guards are skipped on Windows

**Evidence**: `mcp-server.test.ts` (whole suite), `os-scheduling-guard.test.ts` (no bash), `v7-budgets.test.ts` (no `dist/`) → 25 skipped. The maintainer's main OS is Windows.
**Impact**: the MCP server, a core product surface, is untested where it is developed.
**Confidence**: high.
**Recommendation**: spawn the server with `process.execPath` and path-safe args; run `v7-budgets` after `npm run build` in CI; keep the bash guard skipped locally but required in CI. Effort M.

## F-027 — No `update` lifecycle test

**Evidence**: `tests/` has `init-command.test.ts` and `v6-cleanup.test.ts`, nothing for `update` (same gap as F-015).
**Impact**: F-001, F-003, F-004 and F-005 shipped unnoticed.
**Confidence**: high.
**Recommendation**: closed by `phase1_update-lifecycle-tests` (see [08](08-execution-plan.md)).

## F-029 — 80+ silent catch blocks

**Evidence**: recon 01 counts — `git-hooks.ts` 9, `init.ts` 8, `generator.ts` 6, `config-manager.ts` 6, `update.ts` 5+ (e.g. `git-hooks.ts:46, 173, 192`).
**Impact**: maintainer — this is why F-003 and F-006 were invisible.
**Confidence**: medium (counts not re-checked).
**Recommendation**: no blanket rewrite. Inside the shared pipeline (F-019), route best-effort steps through one `bestEffort(step, label)` helper that logs at debug level. Folded into Phase 3. Note: `src/core/logger.ts` exists but nothing in `src/` uses it (F-013).
