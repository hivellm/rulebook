---
name: review
description: Deep code review of recent changes or specified files
model: sonnet
context: fork
agent: code-reviewer
---
Perform a thorough code review.

If $ARGUMENTS is provided, review those specific files or the given PR/commit.
Otherwise, review uncommitted changes via `git diff`.

Steps:
1. Get the diff (git diff or specified files)
2. Review for correctness, bugs, and edge cases
3. Check adherence to project patterns and conventions
4. Identify security concerns
5. Report findings as: blocker / suggestion / nit with file:line references
