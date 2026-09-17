## 1. Core
- [x] 1.1 Learning model: occurrences/lastSeenAt, promotedTo type "skill"; capture() dedupes recurring learnings by slug
- [x] 1.2 LearnManager.skillCandidates(min) and promote(id, "skill") writing .claude/skills/<slug>/SKILL.md as a procedure
- [x] 1.3 SkillsManager scans the project's .claude/skills as category "project"

## 2. Surfaces
- [x] 2.1 MCP: promote target "skill"; skillCandidates in learning list and session start
- [x] 2.2 CLI: rulebook learn promote <id> skill

## 3. Guidance
- [x] 3.1 Templates (rulebook.md, claude-md.md, agents-lean.md): recurring request → learning → skill rule

## 4. Tail (docs + tests — check or waive with tailWaiver)
- [x] 4.1 Update or create documentation covering the implementation
- [x] 4.2 Write tests covering the new behavior
- [x] 4.3 Run tests and confirm they pass
