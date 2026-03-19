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
2. Search memory for relevant past work: `rulebook_memory_search` or `rulebook_session_start`
3. Check `.rulebook/tasks/` for pending work

## During Session
- Update PLANS.md when making key decisions or discoveries
- Save important context to memory as you go

## At Session End
1. Save session summary to PLANS.md: `rulebook_session_end`
2. Summary should include: what was accomplished, key decisions, next steps
3. Update tasks.md with completed items
