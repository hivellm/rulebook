# Decompose multi-file tasks into 1-2 file sub-tasks

# Task Decomposition

When a task touches multiple subsystems, decompose into sub-tasks where each modifies **at most 1-2 files**.

## Why

AI agents lose accuracy when editing 3+ files in one pass. Context from earlier files gets compressed away.

## Rules

1. **Each sub-task modifies 1-2 files** — never more
2. **Each sub-task is independently verifiable** — it compiles, it doesn't break existing behavior
3. **Sub-tasks follow data flow order** — upstream first (component → buffer → renderer → shader)
4. **Each sub-task has a clear "done when"** — not "implement X", but "field Y exists with default Z"
5. **Build after each sub-task** — verify compilation before proceeding

## When an Agent Receives a Multi-File Task

1. **STOP** — do not start implementing
2. **Create a change plan** listing all files and dependency order
3. **Decompose** into sub-tasks following this rule
4. **Report back** with the decomposition
5. **Implement** one sub-task at a time
