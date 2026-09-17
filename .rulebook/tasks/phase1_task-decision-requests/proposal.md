# Proposal: phase1_task-decision-requests

## Why
Tasks driven by an AI regularly stall for lack of a definition: the model hits a
choice it cannot make from the spec, buries the question inside a long reply, marks
the task `blocked` (or leaves it `in-progress`) and moves on. The operator never
sees a crisp question, so unresolved tasks pile up in `.rulebook/tasks/` and the
backlog loop (`rulebook-driver`) keeps re-discovering the same stuck item.

## What Changes
- A first-class **decision request** ("question") attached to a task. The model
  is told to decide on its own whenever the choice is reversible and inside the
  spec; when it cannot, it files a structured question (one line, options,
  its own recommendation, the checklist item it blocks) via
  `rulebook_task {action:"ask"}` and stops working on that item.
- Filing a question moves the task to `blocked`; answering it (`answer`) moves
  it back to `in-progress`. `update status=blocked` without an open question or
  a `blockedBy` dependency is refused with guidance to use `ask`.
- The `ask` result hands the model a ready-to-show operator prompt and an
  instruction to present it as a form (AskUserQuestion in Claude Code).
- Open questions are surfaced everywhere the operator looks: `rulebook_session
  start`, `rulebook_task list`/`show`, `STATE.md`, the tasks README index, and the
  CLI (`rulebook task questions`, interactive `rulebook task answer`).
- `archive` refuses a task with open questions.
- `updateTaskStatus` preserves extra metadata fields (`blocks`, `blockedBy`,
  `questions`) instead of dropping them.
- The `rulebook-driver` workflow halts with `awaiting-decision` and prints the
  open questions instead of looping on a blocked item.
- Both task backends (files, GitHub issues) support questions.

## Impact
- Affected specs: rulebook (task management)
- Affected code: src/core/tasks/*, src/mcp/tools/v7-tools.ts, src/cli/commands/task.ts,
  src/index.ts, src/core/state/state-writer.ts, templates/core/*.md,
  templates/claude-workflows/rulebook-driver.js
- Breaking change: NO (new optional metadata field; `blocked` status now needs a reason)
- User benefit: stuck tasks always carry an explicit, answerable question; no more
  silent accumulation of unresolved work
