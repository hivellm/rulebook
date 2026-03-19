---
name: sequential-editing
tier: 1
description: "Edit files one at a time, never batch-edit"
alwaysApply: true
filePatterns: ["*"]
tools: ["all"]
---

# Sequential File Editing

ALWAYS edit files one at a time: Read file1 → Edit file1 → Read file2 → Edit file2.

NEVER batch-read multiple files then batch-edit them. By the time you edit file 3, context from file 1 may be stale.

When a task touches 3+ files across subsystems:
1. **STOP** — do not start implementing
2. **Plan** the changes (list files, dependency order)
3. **Decompose** into sub-tasks of 1-2 files each
4. **Execute** sub-tasks in dependency order (upstream first)
5. **Build/test** after each sub-task
