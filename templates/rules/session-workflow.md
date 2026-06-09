---
name: session-workflow
tier: 2
description: "Read PLANS.md at session start, save summary at session end"
alwaysApply: true
filePatterns: ["*"]
tools: ["all"]
---

# Session Workflow — Preserve Context Across Sessions

## At Session Start
1. Read `.rulebook/PLANS.md` for current context and active task
2. `rulebook_session_start` loads relevant prior context
3. Check `.rulebook/tasks/` for pending work

## During Session
- Update PLANS.md when making key decisions or discoveries
- Capture knowledge/learnings as you go (`rulebook_knowledge_add` / `rulebook_learn_capture`)

## At Session End
1. Save session summary to PLANS.md: `rulebook_session_end`
2. Summary should include: what was accomplished, key decisions, next steps
3. Update tasks.md with completed items
