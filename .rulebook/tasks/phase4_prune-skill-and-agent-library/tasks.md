## 1. Derive the used set (data-driven, do first)

- [ ] 1.1 Build the keep-list from enabled skills across all projects' `rulebook.json`, the `.claude/commands/` present, and the AGENTS.md delegation agents
- [ ] 1.2 Add the core workflow skills (`task-*`, `handoff`, `continue`, `analysis`, `rulebook-*`) to the keep-list
- [ ] 1.3 Record the final keep-list and the remove-list in the spec for review before any deletion

## 2. Prune the library

- [ ] 2.1 Remove the non-kept skills from `templates/skills/**`
- [ ] 2.2 Remove the non-kept agent templates from the agents template source
- [ ] 2.3 Update `skills-manager.ts` and the agent template engine so they reference only the retained set (no dangling lookups)

## 3. Install path

- [ ] 3.1 Confirm a default `init` provisions only the core keep-list
- [ ] 3.2 Verify `rulebook_skill_list` / `skill_search` return the pruned library with no broken entries

## 4. Tail (mandatory — enforced by rulebook v5.3.0)

- [ ] 4.1 Update or create documentation covering the implementation
- [ ] 4.2 Write tests covering the new behavior
- [ ] 4.3 Run tests and confirm they pass
