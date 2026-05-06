## 1. Detection layer
- [x] 1.1 Add `opencode` field to `DetectionResult` in `src/types.ts` (`detected`, `hasConfigJson`, `hasOpencodeDir`)
- [x] 1.2 Implement `detectOpencode(cwd)` in `src/core/detect/detector.ts` checking `opencode.json` / `opencode.jsonc` / `.opencode/`
- [x] 1.3 Wire `detectOpencode` into the main `detectProject()` aggregator
- [x] 1.4 Add `'opencode'` to the probe list in `src/core/state/config-manager.ts:detectCLITools()`

## 2. opencode.json generator
- [x] 2.1 Create `src/core/ide/opencode-generator.ts` with idempotent merge helper for JSON files
- [x] 2.2 Implement `generateOpencodeConfig(projectRoot, detection)` that adds `$schema`, `mcp.rulebook`, and `instructions` while preserving user keys
- [x] 2.3 Read `.mcp.json` (when present) so the `rulebook` MCP entry mirrors the project's existing server definition
- [x] 2.4 Append project rule files (`AGENTS.md`, `AGENTS.override.md`, `.rulebook/specs/*.md`) to `instructions` with de-duplication
- [x] 2.5 Write `.opencode/.rulebook-managed.json` listing managed keys for safe future updates

## 3. Slash command bridge
- [x] 3.1 Source the user-invocable slash commands from `templates/commands/` directly (no duplicate `templates/ides/opencode/commands/` source set is required — the generator translates on-the-fly)
- [x] 3.2 Translate frontmatter to OpenCode schema (`description`, with `<!-- RULEBOOK:START -->` marker for managed-file detection)
- [x] 3.3 Implement `generateOpencodeCommands(projectRoot)` that emits templates into `.opencode/commands/` idempotently
- [x] 3.4 Preserve user-owned files: leave any pre-existing file untouched when it lacks the `<!-- RULEBOOK:START -->` marker

## 4. Role agent bridge
- [x] 4.1 Source role agents from `templates/agents/` directly (researcher, implementer, tester, code-reviewer, architect, docs-writer, security-reviewer, build-engineer, team-lead, and the rest of the role library)
- [x] 4.2 Map model tiers (`haiku → anthropic/claude-haiku-4-5`, `sonnet → anthropic/claude-sonnet-4-6`, `opus → anthropic/claude-opus-4-7`)
- [x] 4.3 Synthesize per-agent `permission` blocks (read-only roles get `edit: deny` / `bash: ask`; everyone else gets `allow` / `allow`; webfetch always `allow`)
- [x] 4.4 Implement `generateOpencodeAgents(projectRoot)` writing to `.opencode/agents/<role>.md`

## 5. Skills bridge
- [x] 5.1 Source skills from `templates/skills/dev/` directly (no duplicate `templates/ides/opencode/skills/` source set); the generator normalizes names to OpenCode's regex (`[a-z0-9](-[a-z0-9])*`, ≤64 chars)
- [x] 5.2 Validate every `description` is 1-1024 chars; truncate as needed (fallback supplied when source description is empty)
- [x] 5.3 Implement `generateOpencodeSkills(projectRoot)` writing `.opencode/skills/<name>/SKILL.md` files (with orphan-cleanup pass for managed dirs whose source was removed)
- [x] 5.4 Add a name-collision guard so two source skills cannot normalize to the same OpenCode name

## 6. CLI wiring
- [x] 6.1 Invoke the four generators from `src/cli/commands/init.ts` when `detection.opencode.detected` is true
- [x] 6.2 Add OpenCode opt-in to the IDE selection prompt in `src/cli/prompts.ts`
- [x] 6.3 Re-run the generators from `src/cli/commands/update.ts` (preserving user edits)
- [x] 6.4 Export the generator from `src/index.ts`

## 7. Templates expansion
- [x] 7.1 Expand `templates/cli/OPENCODE.md` from stub to full guidance block (sequential editing, test discipline, quality gates, MCP usage)
- [x] 7.2 Expand `templates/skills/cli/opencode/SKILL.md` to match
- [x] 7.3 Create `templates/ides/OPENCODE.md` (the rules block, equivalent to `templates/ides/CURSOR.md`)

## 8. MCP package name verification
- [x] 8.1 Resolved: `@hivellm/rulebook-mcp` is unpublished; `@hivehub/rulebook` is the actual published name with `mcp-server` subcommand
- [x] 8.2 Generator falls back to `npx -y @hivehub/rulebook@latest mcp-server` (mirrors `src/core/claude/claude-mcp.ts`); `.mcp.json` is preferred when it declares `rulebook`

## 9. Spec
- [x] 9.1 `specs/rulebook/spec.md` written with ADDED Requirements covering detection, generation, idempotency, schema compliance, and opt-in/opt-out

## 10. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 10.1 Update or create documentation covering the implementation (CHANGELOG.md Unreleased section + expanded templates/cli/OPENCODE.md, templates/skills/cli/opencode/SKILL.md, new templates/ides/OPENCODE.md)
- [x] 10.2 Write tests covering the new behavior (tests/detect-opencode.test.ts — 5 tests; tests/opencode-generator.test.ts — 18 tests; covers config merge, idempotency, marker preservation, schema validation, name normalization, orphan cleanup)
- [x] 10.3 Run tests and confirm they pass — `npm run type-check` clean, `npm run lint` clean, `npm test` 1457 pass (1 pre-existing unrelated failure in tests/enforce-pre-tool-shell.test.ts verified against clean release/v5.6.0)
