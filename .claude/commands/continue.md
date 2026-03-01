---
name: /continue
id: continue
category: Rulebook
description: Update tasks.md, archive completed tasks, and continue implementation.
---
<!-- RULEBOOK:START -->
**Steps**

1. **Update tasks.md for all active tasks**:
   - Mark completed items as `[x]` in every active `tasks.md`
   - Remove or update items that are no longer relevant

2. **Archive fully completed tasks**:
   For each task where ALL items are `[x]`:
   ```bash
   rulebook task archive <task-id>
   ```

3. **Get current session context**:
   ```bash
   rulebook continue
   ```
   Use this output to understand what's pending and what was done.

4. **Continue implementation**:
   - Pick the next pending task from the context above
   - Work through its `tasks.md` checklist item by item
   - Follow priority order: tests → coverage → update tasks.md → commit

**Reference**
- See `/.rulebook/specs/RULEBOOK.md` for complete task management guidelines
<!-- RULEBOOK:END -->
