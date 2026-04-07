---
name: handoff
description: Save session state to .rulebook/handoff/_pending.md for cross-session continuity
model: sonnet
context: fork
agent: researcher
---
Save a session handoff to `.rulebook/handoff/_pending.md`.

The handoff file MUST contain:

1. **Active task**: current task ID + phase + which checklist items are done
2. **Decisions made this session**: architectural choices, trade-offs, rejected alternatives
3. **Files touched**: list of files modified with one-line reason each
4. **Next steps**: concrete, actionable items (not vague "continue working")
5. **Exact resume command**: what to tell the next session to do first
6. **Open questions / blockers**: anything unresolved that needs the user's input

Write the file to `.rulebook/handoff/_pending.md` using the Write tool.

After writing successfully, display this message prominently:

>>> TYPE /clear NOW — your context will be auto-restored in the next session <<<

If the file `.rulebook/handoff/.urgent` exists, skip any confirmations and write immediately.

The SessionStart hook (`resume-from-handoff.sh`) will automatically inject the handoff content into the next session and archive the file.
