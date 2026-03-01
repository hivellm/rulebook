# Tasks: AGENTS.md Lean Mode

- [ ] Add `mode: "lean" | "full"` to `RulebookConfig` in `src/types.ts`
- [ ] Add mode field to config-manager.ts schema with default "full"
- [ ] Write `templates/core/AGENTS_LEAN.md` lean template (index-only format)
- [ ] Implement lean mode branch in `generateAgentsMd()` in generator.ts
- [ ] Lean AGENTS.md SHALL only contain: project name, brief description, spec file index
- [ ] Lean AGENTS.md MUST be under 3KB
- [ ] Add `--lean` flag to `rulebook init` command
- [ ] Add `--lean` flag to `rulebook update` command
- [ ] Store `mode` in `.rulebook/rulebook.json` on init
- [ ] Respect stored `mode` on update (don't require re-specifying)
- [ ] Add `rulebook mode set lean/full` command for switching modes
- [ ] Show mode in `rulebook status` output
- [ ] Write test: lean mode generates AGENTS.md < 3KB
- [ ] Write test: lean mode includes all spec file references
- [ ] Write test: lean mode preserved across updates
- [ ] Write test: --lean flag saves mode to config
- [ ] Run full test suite
