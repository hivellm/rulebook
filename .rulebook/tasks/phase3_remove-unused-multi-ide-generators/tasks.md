## 1. Scope the generators

- [ ] 1.1 Inventory every code path and template that emits OpenCode, Gemini, Codex, Windsurf, Copilot output; record file list
- [ ] 1.2 Confirm Claude Code and Cursor generators are independent of the removed ones (no shared template that would break)

## 2. Remove generators + templates

- [ ] 2.1 Remove OpenCode/Gemini/Codex/Windsurf/Copilot writers from `src/core/generators/workflow-generator.ts` and sibling generator modules
- [ ] 2.2 Remove their template blocks/files under `templates/`
- [ ] 2.3 Remove their branches from `src/core/detect/detector.ts` and any prompt that offers them

## 3. Config + types

- [ ] 3.1 Narrow `ProjectConfig.ides` (and related types) to the retained targets
- [ ] 3.2 Normalize legacy `rulebook.json` that lists removed IDEs without throwing

## 4. Tail (mandatory — enforced by rulebook v5.3.0)

- [ ] 4.1 Update or create documentation covering the implementation
- [ ] 4.2 Write tests covering the new behavior
- [ ] 4.3 Run tests and confirm they pass
