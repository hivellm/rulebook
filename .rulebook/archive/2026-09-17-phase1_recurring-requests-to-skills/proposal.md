# Proposal: phase1_recurring-requests-to-skills

## Why
Operators ask an agent for the same thing again and again (regenerate X, run the
release checklist, migrate Y the house way). Each time the agent rediscovers the
procedure from scratch: context is limited, sessions rotate, and what was worked
out last week is gone. Rulebook captures learnings, but nothing notices that a
learning keeps recurring, and a learning cannot become a skill — the one artifact
a harness actually reloads on demand.

## What Changes
- `LearnManager.capture()` recognises a recurring learning (same slug, not yet
  promoted): instead of writing a duplicate it bumps `occurrences`, refreshes
  `lastSeenAt` and keeps the newest content. Legacy learnings count as 1.
- `LearnManager.skillCandidates(min)` lists unpromoted learnings seen ≥ `min`
  times (default 2).
- `promote(id, "skill")` writes `.claude/skills/<slug>/SKILL.md` — a
  procedure (when to use, steps, verify), user-owned, surviving `rulebook update`
  — and marks the learning promoted.
- `SkillsManager` scans the project's `.claude/skills/` as category `project`,
  so `rulebook_skill list|show|search` and the CLI see them next to packaged
  skills. They stay opt-in for generation (enabled only when listed in config),
  exactly like every other skill.
- `rulebook_session start` and `rulebook_memory {kind:"learning", action:"list"}`
  return `skillCandidates` with a hint; `promote` accepts `target:"skill"`; CLI
  `rulebook learn promote <id> skill`.
- Guidance in the generated `CLAUDE.md`, lean `AGENTS.md` and the task spec: the
  same request again → capture it as a learning under the same title (the count
  grows); at two or more, promote it to a skill written as a procedure.

## Impact
- Affected specs: rulebook (task management / memory)
- Affected code: src/core/tasks/learn-manager.ts, src/core/skills/skills-manager.ts,
  src/types.ts, src/mcp/tools/v7-tools.ts, src/cli/commands/context-intelligence.ts,
  templates/core/*.md
- Breaking change: NO (new optional fields; new category value `project`)
- User benefit: repeated requests converge on one reusable, reloadable procedure
  instead of being re-derived under a shrinking context every time
