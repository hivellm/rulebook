---
name: /rulebook-task-archive
id: rulebook-task-archive
category: Rulebook
description: Archive a completed Rulebook task and apply spec deltas to main specifications.
---
<!-- RULEBOOK:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `/.rulebook/specs/RULEBOOK.md` for complete task management guidelines.

**Steps**
1. **Verify Task Completion**:
   - All items in `tasks.md` must be marked as `[x]`
   - All tests must pass
   - Code review complete (if applicable)
   - Documentation updated (README, CHANGELOG, specs)

2. **Run Quality Checks**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   npm run build
   ```
   Ensure all checks pass before archiving.

3. **Validate Task Format**:
   ```bash
   rulebook task validate <task-id>
   ```
   Must pass all format checks.

4. **Archive Task**:
   ```bash
   rulebook task archive <task-id>
   ```
   Or without prompts:
   ```bash
   rulebook task archive <task-id> --skip-validation
   ```
   (Only use `--skip-validation` if you're certain the task is valid)

5. **Archive Process**:
   - Validates task format (unless skipped)
   - Checks task completion status
   - Applies spec deltas to main specifications
   - Moves task to `/.rulebook/tasks/archive/YYYY-MM-DD-<task-id>/`
   - Updates related specifications

6. **Verify Archive**:
   ```bash
   rulebook task list --archived
   ```
   Task should appear in archived list.

7. **Post-Archive Actions**:
   - Ensure spec deltas are applied to main specifications
   - Update CHANGELOG.md with the change
   - Document any breaking changes
   - Create migration guides (if needed)
   - Unblock related tasks (if any)

8. **🚨 MANDATORY: Deferred Items → Tasks Rule**:
   **ABSOLUTE RULE — NO EXCEPTIONS**: Whenever a task is archived with items marked as "Deferred" or "Phase X+", you MUST immediately create Rulebook tasks for those deferred items **before archiving**.

   ```
   ❌ WRONG — defer without creating task:
   1. Archive task with "- [ ] D1. feature X — deferred Phase 4"
      → Feature X is now forgotten forever

   ✅ CORRECT — defer with tracking:
   1. Add "- [ ] D1. feature X — deferred Phase 4" to tasks.md
   2. Call rulebook_task_create("phase4-feature-x")
   3. Write tasks.md for the new task with full context
   4. THEN call rulebook_task_archive
   ```

   **Archive Checklist (ALL must be done before archiving):**
   ```
   □ 1. tasks.md uses - [x] for implemented, - [ ] for deferred
   □ 2. Each deferred item has a "Phase N" target
   □ 3. A rulebook task exists for EVERY deferred item or group
   □ 4. The new deferred tasks have tasks.md with full context
   □ 5. THEN call rulebook_task_archive
   ```

**Reference**
- Use `rulebook task list --archived` to see archived tasks
- Use `rulebook task show <task-id>` to view task details
- See `/.rulebook/specs/RULEBOOK.md` for complete task management guidelines
<!-- RULEBOOK:END -->

