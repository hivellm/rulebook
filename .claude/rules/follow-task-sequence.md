# Execute tasks in the exact order defined — no reordering, no cherry-picking

# Follow Task Sequence — No Reordering, No Cherry-Picking

When a `tasks.md` checklist defines a sequence, execute items in EXACTLY that order.

## Forbidden

- Skipping ahead to "easier" or "more interesting" tasks
- Reordering tasks because you think a different order is better
- Cherry-picking tasks from the middle of a list
- Deciding which tasks are "important enough" to do
- Grouping or batching tasks in a different sequence
- Starting Phase N+1 before Phase N is 100% complete

## Required Behavior

1. Read `tasks.md` from top to bottom
2. Find the FIRST unchecked item (`- [ ]`)
3. Implement THAT item — not the one you prefer
4. Mark it `[x]` with what was done
5. Move to the NEXT unchecked item
6. Repeat until all items are checked

## Why

The human spent time defining the task sequence for a reason. The order reflects dependencies, priorities, and a deliberate implementation strategy. When AI agents skip around, dependencies break, progress tracking becomes unreliable, and work has to be redone.

**The task list is an ORDER, not a MENU.**
