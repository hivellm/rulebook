# Tasks: AGENTS.md Lean Mode

- [x] Add `agentsMode: "lean" | "full"` to `RulebookConfig` and `ProjectConfig` in `src/types.ts`
- [x] Add agentsMode field to config-manager.ts schema with default "full"
- [x] Write `templates/core/AGENTS_LEAN.md` lean template (index-only format)
- [x] Implement `generateLeanAgents()` in generator.ts (writes spec files + lean index)
- [x] Lean AGENTS.md SHALL only contain: brief description, spec file index
- [x] Lean AGENTS.md MUST be under 3KB
- [x] Add `--lean` flag to `rulebook init` command
- [x] Add `--lean` flag to `rulebook update` command
- [x] Store `agentsMode` in `.rulebook/rulebook.json` on init
- [x] Respect stored `agentsMode` on update (don't require re-specifying)
- [x] Add `rulebook mode set lean/full` command for switching modes
- [x] Show agentsMode in `rulebook ralph status` output
- [x] Wire lean mode through `generateFullAgents()` dispatch
- [x] Write test: lean mode generates AGENTS.md < 3KB
- [x] Write test: lean mode includes all spec file references
- [x] Write test: lean mode RULEBOOK:START/END markers present
- [x] Write test: spec files still written to .rulebook/specs/
- [x] Run full test suite (877 tests passing)
