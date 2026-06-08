## 1. OpenCode (stage 1)

- [x] 1.1 Remove `opencode-generator.ts`, its re-exports, init/update calls, templates, and tests

## 2. multi-tool-generator (stage 2)

- [ ] 2.1 Remove `src/core/ide/multi-tool-generator.ts` (Gemini/Windsurf/Copilot/Continue) and its `generator.ts` usage
- [ ] 2.2 Remove `templates/ides/*` (GEMINI_RULES, WINDSURF_RULES, COPILOT_INSTRUCTIONS, CONTINUE_RULES)

## 3. Agent runners (stage 3)

- [ ] 3.1 Remove `src/agents/cursor-agent.ts` and `src/agents/gemini-cli.ts`
- [ ] 3.2 Update `cli-bridge.ts` to dispatch only the Claude runner; drop cursor/gemini references in config-manager and types

## 4. Detection (stage 4)

- [ ] 4.1 Remove IDE detection (`detectCursor/Windsurf/GeminiCli/GithubCopilot/ContinueDev/Opencode`) from `detector.ts`
- [ ] 4.2 Remove the IDE detection types from `types.ts`

## 5. Rule generators (stage 5)

- [ ] 5.1 Remove IDE/CLI rule generators from `workflow-generator.ts` (cursor/windsurf rules, cursor commands, CODEX/GEMINI cli files)
- [ ] 5.2 Remove their calls + `.cursorrules`/`.windsurfrules` handling from `init.ts`/`update.ts`

## 6. Config surface (stage 6)

- [ ] 6.1 Remove `ProjectConfig.ides` and the IDE selection prompt; normalize legacy configs without throwing
- [ ] 6.2 Clean config-manager/workspace-types of IDE plumbing

## 7. Templates + tests (stage 7)

- [ ] 7.1 Delete the per-tool template matrix: non-Claude `templates/cli/*`, `templates/skills/ides/*`, non-Claude `templates/skills/cli/*`
- [ ] 7.2 Delete/adjust IDE detection + generation tests

## 8. Tail (mandatory — enforced by rulebook v5.3.0)

- [ ] 8.1 Update or create documentation covering the implementation
- [ ] 8.2 Write tests covering the new behavior
- [ ] 8.3 Run tests and confirm they pass
