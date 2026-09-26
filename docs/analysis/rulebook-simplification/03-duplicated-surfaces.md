# 03 — Duplicated Surfaces

The same job done in two or more places. Duplication itself is not always the problem; drift between the copies is.

## F-016 — CLI commands mirror MCP tools

**Evidence**: `context-intelligence.ts` (192 lines), `skills.ts` (315), `task.ts` (530), `workspace.ts` (174) use the same managers as `v7-tools.ts` (`DecisionManager`, `KnowledgeManager`, `LearnManager`, `SkillsManager`, the task manager). Asymmetries:

| Action | CLI | MCP |
|---|---|---|
| `decision supersede`, `knowledge remove` | yes | no |
| `continue`, `mode set` | yes | no |
| `rules add/project` | yes | no (`rulebook_rules` is list-only) |
| `workspace add/remove/init` | yes | no |
| `skill enable/disable` | yes | yes |

`task blockers/blocked-by` read `.metadata.json` inline instead of going through the task manager (recon 02, not re-checked).
**Impact**: maintainer — two surfaces drift.
**Confidence**: high on the overlap; medium on the inline-read claim.
**Recommendation**: keep both surfaces (hooks, CI, humans and non-MCP tools need the CLI). Make MCP the superset (add `decision supersede`, `knowledge remove`, `session continue`) and make every CLI command a thin call into a manager. ~+60 lines MCP, ~−80 lines CLI. Not breaking.

## F-017 — Four config loaders; one is a real duplicate

**Evidence**: `ConfigManager.loadConfig` (`config-manager.ts:85`) is canonical and runs `migrateConfig`. `generator.ts:622 loadProjectConfigFromRulebook` and `project-worker.ts:121 getRulebookConfig` wrap it (fine). `src/mcp/rulebook-server.ts:67 loadConfig()` reads `rulebook.json` raw into `any`, skipping migration.
**[recon corrected]**: four loaders, not three; only the MCP server's matters.
**Impact**: the MCP server can see un-migrated config; 4 of the codebase's 24 `any`s live here.
**Confidence**: high.
**Recommendation**: the server keeps `findRulebookConfig` for root discovery, then calls `createConfigManager(root).loadConfig()`. ~−40 lines. Not breaking.

## F-018 — Several writers per generated file

**Evidence** (recon 02; spot-checked for `.mcp.json`):

| File | Writers |
|---|---|
| `.mcp.json` | init (via merger), `mcp.ts`, `init.ts addSequentialThinkingMcp`, `claude.ts` |
| `.claude/settings.json` | init, update, `claude setup` |
| `PLANS.md` | plans-manager, `rulebook_session end`, CLI `continue` |
| `.rulebook/rulebook.json` | state-writer, config-manager |

**Impact**: maintainer — the same merge/preserve rules are re-implemented and diverge.
**Confidence**: medium-high.
**Recommendation**: one writer module per file — a new `mcp-json-writer.ts`; `claude-settings-manager` and `plans-manager` already exist — and route every caller through it. ~−150 lines net. Not breaking.

## F-019 — init and update implement the same pipeline twice

**Evidence**: `init.ts` 660 lines / 16 try-catch; `update.ts` 815 / 19. Shared steps: detect, directory migration, flat-layout migration, AGENTS merge, CLAUDE.md merge, path-scoped rules, Claude Code setup, TypeSafe, plans init, accidental-dir cleanup, advisory (recon 04; 6 shared spinner labels confirm it). `--minimal/--light/--lean` are parsed in both (`init.ts:135-175`, `update.ts:160-203`).
**Impact**: maintainer — every lifecycle fix must be made twice. F-001..F-006 are consequences.
**Confidence**: high.
**Recommendation**: extract `applyRulebook(cwd, resolvedConfig, { fresh })` in `src/core/lifecycle/`. init = prompt → resolve → apply; update = load → merge → apply → cleanup → report. Target −500 lines, one place to test. Large; needs a Fable design review. Not breaking (same outputs). Timing is Q4.

## F-020 — Two skills paths (`.claude/commands` vs `.claude/skills`)

**Evidence**: recon 01 reported both as active (`claude.ts:83/87`, `init.ts:509`, `update.ts:562`). In fact the commands path is dead (F-006: `claude-mcp.ts:104-115` reads a missing directory). `SkillsManager` already targets `.claude/skills` (`skills-manager.ts:31`).
**Impact**: maintainer confusion about where skills go.
**Confidence**: high.
**Recommendation**: closed by F-006. Once the commands installer is gone, only `.claude/skills` remains.
