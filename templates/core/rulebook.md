<!-- RULEBOOK:START -->
# Rulebook Task Management

Spec-driven task tracking for multi-session work. Managed via the `rulebook` MCP
tools (`rulebook_task_*`) or the CLI (`rulebook task <cmd>`) — never create task
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
- Execute items in the listed order: first unchecked item of the
  lowest-numbered phase. The list is an order, not a menu.
- No deferred items: implement, or explain concretely why impossible. To hand
  work off, create a follow-up task BEFORE archiving — no orphan items.
- Every task ends with the mandatory tail: update docs → write tests → run
  tests and confirm they pass. `archive` refuses otherwise.

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

1. `rulebook_task_create` (or `rulebook task create <task-id>`) BEFORE coding
2. Fill proposal.md, tasks.md, and spec deltas
3. `rulebook_task_validate` — fix format errors before starting
4. Implement item by item; run type-check + lint after each significant change
5. `rulebook_task_update` to move status: pending → in-progress → completed
6. `rulebook_task_archive` — applies spec deltas to `/.rulebook/specs/` and
   moves the task to `.rulebook/archive/YYYY-MM-DD-<task-id>/`

## CLI quick reference

```bash
rulebook task list | show <id> | create <id> | validate <id> [--strict]
rulebook task update <id> --status <s> | --progress <n>
rulebook task archive <id> [--yes]
```
<!-- RULEBOOK:END -->
