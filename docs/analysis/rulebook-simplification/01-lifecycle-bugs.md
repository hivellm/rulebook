# 01 — Lifecycle Bugs in init/update

The v7.4.0 self-update of this repo showed the symptoms. All eight findings live in the install/refresh path. None has an `update` test (see F-015, F-027).

## F-001 — `installedAt` is reset on every update

**Evidence**: `src/cli/commands/update.ts:490-492` recovers `installedAt` by matching `/Generated at: (.+)/` in AGENTS.md. Only the full generator emits that line (`src/core/generators/generator.ts:41`). Lean is the default (`update.ts:183`: `leanMode = options.lean ?? existingConfig?.agentsMode !== 'full'`), and lean AGENTS.md has no such line, so the code falls back to `new Date()`. This repo's `rulebook.json` has `installedAt === updatedAt`.
**Impact**: user-facing — install age is wrong; any "installed N days ago" logic is void.
**Confidence**: high (code read, symptom observed).
**Recommendation**: `installedAt: existingConfig.installedAt ?? new Date().toISOString()`; delete the regex. ~3 lines. Not breaking.

## F-002 — `mode` and `agentsMode` overlap; `lightMode` is read through `as any`

**Evidence**: `update.ts:495` and `init.ts:345` write `mode: minimal|full`. `update.ts:162-164` reads it once to re-derive minimal. `update.ts:166-167` reads `(existingConfig as any).lightMode`, a field missing from `RulebookConfig`. `agentsMode: lean|full` sits beside it (`update.ts:511-515`, `config-manager.ts:215`).
**[recon corrected]**: recon said `mode` is unused. It is not — it is the only saved signal for minimal scaffolds.
**Impact**: maintainer — three overlapping switches (minimal, light, lean) for one concept.
**Confidence**: high.
**Recommendation**: one field `mode: 'minimal' | 'lean' | 'full'`, with a `migrateConfig` step mapping `{mode, agentsMode, lightMode}` to it; drop `lightMode` and `agentsMode`. ~40 lines across `types.ts`, `config-manager.ts`, `init.ts`, `update.ts`, `plans.ts:56`. Minor (schema change, migrated automatically).

## F-003 — Agents and workflow scripts have no install path; old copies rot

**Evidence**: `src/core/claude/claude-mcp.ts:347-365` installs them only when `options.includeAgents` / `includeWorkflows` are true. All three callers (`claude.ts:37`, `init.ts:500`, `update.ts:553`) call `setupClaudeCodeIntegration(cwd)` with no options. Nothing outside tests calls `installAgentDefinitions` / `installWorkflowDefinitions`. Pre-v7 copies are neither refreshed nor removed by `v6-cleanup` — this repo has `.claude/agents/*` with Rust placeholders and a diverged `.claude/workflows/spec-author.js`.
**[recon corrected]**: not "never refreshed by update" but "unreachable from every command".
**Impact**: user-facing — stale agents contradict the v7.4 routing rule; 1,208 template lines ship for nothing.
**Confidence**: high.
**Recommendation**: (1) `update` refreshes `.claude/agents` / `.claude/workflows` when the directory already exists and the files carry the owned marker; (2) `rulebook claude setup --agents --workflows` becomes the explicit opt-in. ~40 lines in `claude-mcp.ts` + `update.ts`. Not breaking. Whether to go further is Q1.

## F-004 — Stale language specs are never removed

**Evidence**: `generator.ts:960-962` writes `.rulebook/specs/<language>.md` for each detected language via `writeModularFile` (`generator.ts:541-552`). No code removes them. This TypeScript repo still carries `.rulebook/specs/rust.md`.
**[recon corrected]**: lines 960-962, not 976-983.
**Impact**: tokens — AGENTS.md references stale specs and agents read them.
**Confidence**: high.
**Recommendation**: after generation in `update`, delete `specs/<lang>.md` for any language in `templates/rules|languages` that is not detected, only if the file carries `OWNED_MARKERS` (reuse `v6-cleanup.ts:116`). ~25 lines. Not breaking.

## F-005 — CLAUDE.md is backed up on every run, even when unchanged

**Evidence**: `src/core/claude/claude-md-generator.ts:157-172` copies to `.rulebook/backup/CLAUDE.md.backup-<ts>` whenever the file exists. This repo has 16 backups.
**[recon corrected]**: the path is `core/claude/`, not `core/generators/`.
**Impact**: user-facing clutter that grows without limit.
**Confidence**: high.
**Recommendation**: skip the backup when `existing === content`; keep the newest 3. ~10 lines.

## F-006 — The `.claude/commands` installer copies from a directory that does not exist

**Evidence**: `claude-mcp.ts:104-115` reads `templates/commands`, which does not exist. The function always returns `[]`, so the "skills installed to .claude/commands/" messages at `claude.ts:83`, `init.ts:509`, `update.ts:562` never print. The two files in this repo's `.claude/commands/` are user-authored.
**Impact**: maintainer — a dead path presented as a feature; it is also the source of the "two skills paths" confusion (F-020).
**Confidence**: high.
**Recommendation**: delete `installClaudeCodeSkills`, its result field `skillsInstalled`, and the three messages. Keep `v6-cleanup` `RETIRED_COMMANDS` (it removes old installs). ~60 lines. Not breaking.

## F-007 — `applyClaudeSettings` has no opt-out

**Evidence**: `src/core/claude/claude-settings-manager.ts:151-254` (recon 04 only, not re-read by the architect). It installs two PreToolUse guards, sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, adds the full-autonomy allow list, sets `statusLine` and `model` when absent, and strips legacy signatures. init, update and `claude setup` call it with hard-coded choices.
**Impact**: user-facing for people who manage `.claude/settings.json` by hand.
**Confidence**: medium (recon only).
**Recommendation**: defer. Add `--no-settings` on `claude setup` / `update` only if a user asks (Q5).

## F-008 — The CI workflow generator reaches 11 of 40 templates

**Evidence**: `templates/workflows/` holds 40 YAML files (2,261 lines). `src/core/generators/workflow-generator.ts:30-78` has if/else branches for rust, typescript, python, go and java only, copying `-test` and (in full mode) `-lint`, plus `codespell.yml`. No `-publish.yml` file is referenced anywhere.
**[recon corrected]**: recon 03 counted "CI 1".
**Write-up check**: the synthesis says 10 of 40 and 14 publish files. The code also copies `codespell.yml` (line 77), and there are 11 `-publish.yml` files (cpp, dotnet, elixir, go, java, kotlin, php, python, rust, swift, typescript). So 29 templates are unreachable: 11 publish + 18 test/lint for cpp, dotnet, elixir, erlang, kotlin, php, solidity, swift, zig.
**Impact**: maintainer (29 files kept for nothing) and user-facing (cpp, erlang, solidity and zig are detected but get no CI although templates exist).
**Confidence**: high.
**Recommendation**: replace the branch ladder with `for lang of languages: copyIfExists(<lang>-test.yml); if full: copyIfExists(<lang>-lint.yml)`. Delete the 11 `-publish.yml` files or wire them behind `--publish`. ~−120 lines of TypeScript. Not breaking (a superset of today's output). Note: the C# templates are named `dotnet-*`, so a name-driven copy needs a `csharp → dotnet` alias once F-022 adds C# detection.
