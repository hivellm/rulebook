## 1. Detection layer
- [ ] 1.1 Add `opencode` field to `DetectionResult` in `src/types.ts` (`detected`, `hasConfigJson`, `hasOpencodeDir`)
- [ ] 1.2 Implement `detectOpencode(cwd)` in `src/core/detect/detector.ts` checking `opencode.json` / `opencode.jsonc` / `.opencode/`
- [ ] 1.3 Wire `detectOpencode` into the main `detectProject()` aggregator
- [ ] 1.4 Add `'opencode'` to the probe list in `src/core/state/config-manager.ts:detectCLITools()`

## 2. opencode.json generator
- [ ] 2.1 Create `src/core/ide/opencode-generator.ts` with idempotent merge helper for JSON files
- [ ] 2.2 Implement `generateOpencodeConfig(projectRoot, detection)` that adds `$schema`, `mcp.rulebook`, and `instructions` while preserving user keys
- [ ] 2.3 Read `.mcp.json` (when present) so the `rulebook` MCP entry mirrors the project's existing server definition
- [ ] 2.4 Append project rule files (`AGENTS.md`, `AGENTS.override.md`, `.rulebook/specs/*.md`) to `instructions` with de-duplication
- [ ] 2.5 Write `.opencode/.rulebook-managed.json` listing managed keys for safe future updates

## 3. Slash command bridge
- [ ] 3.1 Create `templates/ides/opencode/commands/` with one `<name>.md` per user-invocable Rulebook slash command
- [ ] 3.2 Translate frontmatter to OpenCode schema (`description`, optional `agent`, `model`, `subtask`)
- [ ] 3.3 Implement `generateOpencodeCommands(projectRoot)` that copies templates into `.opencode/commands/` idempotently
- [ ] 3.4 Preserve user-owned files: leave any pre-existing file untouched when it lacks the `<!-- RULEBOOK:START -->` marker

## 4. Role agent bridge
- [ ] 4.1 Create `templates/ides/opencode/agents/` source files for each role (researcher, implementer, tester, code-reviewer, architect, docs-writer, security-reviewer, build-engineer, team-lead)
- [ ] 4.2 Map model tiers (`haiku → anthropic/claude-haiku-4-5`, `sonnet → anthropic/claude-sonnet-4-6`, `opus → anthropic/claude-opus-4-7`)
- [ ] 4.3 Synthesize per-agent `permission` blocks from rulebook safety rules (deny `rm *`, `git reset --hard *`, `git push --force *`; ask on `edit` for read-only roles)
- [ ] 4.4 Implement `generateOpencodeAgents(projectRoot)` writing to `.opencode/agents/<role>.md`

## 5. Skills bridge
- [ ] 5.1 Create `templates/ides/opencode/skills/` source set normalized to OpenCode's name regex (`[a-z0-9](-[a-z0-9])*`, ≤64 chars)
- [ ] 5.2 Validate every `description` is 1-1024 chars; truncate or expand as needed
- [ ] 5.3 Implement `generateOpencodeSkills(projectRoot)` writing `.opencode/skills/<name>/SKILL.md` files
- [ ] 5.4 Add a name-collision guard so two source skills cannot normalize to the same OpenCode name

## 6. CLI wiring
- [ ] 6.1 Invoke the four generators from `src/cli/commands/init.ts` when `detection.opencode.detected` is true
- [ ] 6.2 Add OpenCode opt-in to the IDE selection prompt in `src/cli/prompts.ts`
- [ ] 6.3 Re-run the generators from `src/cli/commands/update.ts` (preserving user edits)
- [ ] 6.4 Export the generator from `src/index.ts`

## 7. Templates expansion
- [ ] 7.1 Expand `templates/cli/OPENCODE.md` from stub to full guidance block (sequential editing, test discipline, quality gates, MCP usage)
- [ ] 7.2 Expand `templates/skills/cli/opencode/SKILL.md` to match
- [ ] 7.3 Create `templates/ides/OPENCODE.md` (the rules block, equivalent to `templates/ides/CURSOR.md`)

## 8. MCP package name verification
- [ ] 8.1 Resolve the published npm name for the Rulebook MCP server (`npm view @hivellm/rulebook-mcp` or local check)
- [ ] 8.2 If unpublished, document the `node /absolute/path/server.js` fallback and gate the npx command behind a config flag

## 9. Spec
- [ ] 9.1 Write `specs/rulebook/spec.md` with ADDED Requirements covering detection, generation, idempotency, schema compliance, opt-in/out

## 10. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 10.1 Update or create documentation covering the implementation (README.md OpenCode entry, CHANGELOG.md unreleased section)
- [ ] 10.2 Write tests covering the new behavior (`tests/detect-opencode.test.ts`, `tests/opencode-generator.test.ts` — config merge, idempotency, marker preservation, schema validation, name normalization)
- [ ] 10.3 Run tests and confirm they pass (`npm run type-check && npm run lint && npm test`)
