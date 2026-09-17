<!-- RULEBOOK:START -->
# Rulebook Task Management

Spec-driven task tracking for multi-session work. Managed via the `rulebook` MCP
tools (`rulebook_task`) or the CLI (`rulebook task <cmd>`) — never create task
directories by hand.

## When to use

- ✅ New features, breaking changes, architecture or performance/security work
- ❌ Small bug fixes, typos, formatting, non-breaking dependency updates — no
  task ceremony needed

## Structure

```
.rulebook/tasks/<task-id>/        # task-id: phase<N>_<kebab-name>  (e.g. phase1_add-auth)
├── proposal.md                   # Why (≥20 chars) + What Changes + Impact
├── tasks.md                      # ONLY `- [ ]` / `- [x]` checklist items
├── design.md                     # optional technical design
└── specs/<module>/spec.md        # requirements (SHALL/MUST + Given/When/Then)
```

Never create README.md, PROCESS.md, or any other file in a task directory.

## tasks.md rules

- Checklist items only — no essays. Mark `[x]` as each item completes.
- Order expresses dependencies: never start an item whose prerequisites are
  incomplete; independent items may run in any order or in parallel.
- No deferred items: implement, or explain concretely why impossible. To hand
  work off, create a follow-up task BEFORE archiving — no orphan items.
- Tasks scaffold a docs + tests tail: check the items, or archive with a
  one-line `tailWaiver` stating why they don't apply (doc-only, covered
  refactor, tooling).

## Decide or ask — never stall silently

A task blocked "for lack of definition" with the question buried in a long reply
is the failure mode this section prevents.

1. **Decide yourself** when the choice is reversible, inside the spec, and a
   competent engineer would not escalate it. Record it (`rulebook_memory
   {kind:"decision"}` if it shapes architecture; otherwise a line in design.md).
2. **Ask explicitly** when you cannot: `rulebook_task {action:"ask", taskId,
   question, options:["A — trade-off", "B — trade-off"], recommended:"A",
   blocks:"<checklist item>"}` (CLI: `rulebook task ask <id> -q ... -o ... -r ...`).
   That marks the task `blocked`, stores the question, and returns an
   `operatorPrompt` — show it to the operator as a form (AskUserQuestion in
   Claude Code) and stop working on that item. Move to an unblocked item or end.
3. **Never** set `status:"blocked"` without an open question or a `blockedBy`
   dependency — the update is refused. Never archive over an open question.
4. The operator answers with `rulebook_task {action:"answer", taskId,
   questionId, answer}` or `rulebook task answer <id>` (interactive). The task
   returns to `in-progress`; resume the blocked item. Open questions are listed
   in `rulebook_session start`, `rulebook_task {action:"questions"}`, `STATE.md`
   and the tasks README — check them before starting new work.

## Spec format

```markdown
## ADDED Requirements            # or MODIFIED / REMOVED / RENAMED
### Requirement: <Name>
The system SHALL/MUST <do something>.

#### Scenario: <Name>            # exactly 4 hashtags
Given <context>
When <action>
Then <outcome>
```

## Workflow

1. `rulebook_task {action:"create"}` (or `rulebook task create <task-id>`) BEFORE coding
2. Fill proposal.md, tasks.md, and spec deltas
3. `rulebook_task {action:"validate"}` — fix format errors before starting
4. Implement item by item; run type-check + lint after each significant change
5. `rulebook_task {action:"update"}` to move status: pending → in-progress → completed
6. `rulebook_task {action:"archive"}` — applies spec deltas to `/.rulebook/specs/`
   and moves the task to `.rulebook/archive/YYYY-MM-DD-<task-id>/`

## CLI quick reference

```bash
rulebook task list | show <id> | create <id> | validate <id> [--strict]
rulebook task update <id> --status <s> | --progress <n>
rulebook task archive <id> [--yes]
```
<!-- RULEBOOK:END -->