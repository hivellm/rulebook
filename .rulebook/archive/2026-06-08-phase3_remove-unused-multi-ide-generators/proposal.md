# Proposal: phase3_remove-unused-multi-ide-generators

## Why

Rulebook ships a large per-tool adapter matrix — IDE/CLI integrations for
Cursor, Windsurf, Gemini, Codex, GitHub Copilot, OpenCode, Cline, Continue,
Aider, Amazon Q, Auggie, Codebuddy, Codeium, Factory, Kilocode, JetBrains AI,
Replit, Tabnine, Zed, VS Code, and more. Each adds detection, generators,
templates, agent stream-parsers, config plumbing, and tests.

This matrix is now redundant: **`AGENTS.md` is the universal standard** that all
of these tools read natively. Keeping `AGENTS.md` (+ `CLAUDE.md` and `.claude/`
for Claude Code, the team's primary tool) preserves full tool-agnostic coverage
while deleting the N per-tool adapters. The decision (user): remove **all**
IDE/CLI-specific resources, including Cursor, and rely on AGENTS.md generality.

## What Changes

Keep only the tool-agnostic outputs: **`AGENTS.md`**, **`AGENTS.override.md`**,
**`CLAUDE.md`**, and the **`.claude/`** directory (Claude Code).

Remove every per-tool adapter end-to-end:

- Pure files: `src/core/ide/multi-tool-generator.ts`,
  `src/core/ide/opencode-generator.ts`, `src/agents/cursor-agent.ts`,
  `src/agents/gemini-cli.ts`.
- Mixed files: `src/core/detect/detector.ts` (IDE detection),
  `src/core/generators/workflow-generator.ts` (IDE/CLI rule generators),
  `src/core/console/cli-bridge.ts` (cursor/gemini agent runners),
  `src/cli/prompts.ts` (IDE selection), `src/types.ts`
  (`ProjectConfig.ides` + IDE detection types), `src/core/state/config-manager.ts`,
  `src/cli/commands/init.ts` + `update.ts` (IDE generation + `.cursorrules`/
  `.windsurfrules` handling), `src/index.ts`.
- Templates: `templates/ides/`, the non-Claude entries in `templates/cli/`,
  `templates/skills/ides/*`, and the non-Claude entries in `templates/skills/cli/*`.
- Tests covering IDE detection/generation.

Sequential-thinking MCP and `.vscode/` editor settings are retained (not
AI-rule adapters); MCP config targets `.mcp.json` only.

## Impact

- Affected specs: `specs/ide-generators/spec.md`
- Affected code: detector, generators, cli-bridge, prompts, types,
  config-manager, init/update, index, and the template matrix + tests.
- Breaking change: YES (target 6.0.0). Already-generated IDE files in user
  repos are left in place; they simply stop being regenerated. Legacy configs
  with an `ides` field are normalized away without error.
- User benefit: far smaller surface; rulebook becomes a focused AGENTS.md +
  Claude tool while staying tool-agnostic via the AGENTS.md standard.

## Staged execution (each stage ships green)

1. **OpenCode** — generator + calls + templates + tests. ✅ done
2. **multi-tool-generator** — Gemini/Windsurf/Copilot/Continue generation + templates.
3. **Agent runners** — remove cursor/gemini stream-parsers; cli-bridge keeps Claude only.
4. **Detection** — remove IDE detection from detector.ts + IDE detection types.
5. **workflow-generator** — remove IDE/CLI rule generators + init/update calls + `.cursorrules`/`.windsurfrules`.
6. **Config surface** — remove `ProjectConfig.ides`, prompts IDE selection, config-manager plumbing.
7. **Templates + tests** — delete the remaining per-tool template matrix; prune/adjust tests; CHANGELOG.
