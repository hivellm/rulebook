---
name: /rulebook-task-apply
id: rulebook-task-apply
category: Rulebook
description: Implement an approved Rulebook task and keep tasks checklist in sync.
---
<!-- RULEBOOK:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `/.rulebook/specs/RULEBOOK.md` for complete task management guidelines.
- **CRITICAL**: Update `tasks.md` IMMEDIATELY after completing and testing each implementation step.

**Steps**
Track these steps as TODOs and complete them one by one.

1. **Check Knowledge Base FIRST (MANDATORY)**:
   Before writing any code, search for relevant patterns and anti-patterns:
   ```bash
   rulebook knowledge list
   ```
   Also search learnings related to this area:
   ```bash
   rulebook learn list
   ```
   Apply any relevant patterns. Avoid any documented anti-patterns.

2. **Read Task Details**:
   ```bash
   rulebook task show <task-id>
   ```
   Read `proposal.md`, `design.md` (if present), and `tasks.md` to confirm scope and acceptance criteria.

3. **Follow Priority Order (MANDATORY)**:
   - **Tests** (HIGHEST PRIORITY) - Write tests first
   - **Coverage Verification** (CRITICAL) - Verify coverage ≥95%
   - **Update Task Status** (MANDATORY) - Mark completed items as `[x]` in `tasks.md`
   - **Next Task** (Only after above steps)

4. **Work Through Tasks Sequentially**:
   - Work through `tasks.md` checklist item by item
   - Keep edits minimal and focused on the requested change
   - Follow priority order (most critical first)

5. **After Each Implementation Step**:
   - ✅ Implement the feature
   - ✅ Test the implementation
   - ✅ Verify test coverage (run `npm test -- --coverage`)
   - ✅ Update `tasks.md` IMMEDIATELY (mark as `[x]`)
   - ✅ Commit locally (backup)
   - ✅ Only then proceed to next task

6. **Update Tasks Checklist**:
   After completing and testing each item:
   ```markdown
   ## 1. Implementation Phase
   - [x] 1.1 Create task manager module <!-- tested, coverage: 95% -->
   - [x] 1.2 Add validation logic <!-- tested, coverage: 92%, status: complete -->
   - [ ] 1.3 Add archive functionality <!-- next: will start after status update -->
   ```

7. **Confirm Completion**:
   - Make sure every item in `tasks.md` is finished
   - All tests pass
   - Coverage meets thresholds
   - Documentation updated

8. **Update Checklist After All Work**:
   - Mark each completed task as `[x]`
   - Add comments with test status and coverage
   - Reflect reality in the checklist

9. **Capture Learnings (MANDATORY)**:
   After completing the task, record what you learned:
   - **Patterns that worked** → `rulebook knowledge add pattern "<title>" --category <cat>`
   - **Anti-patterns discovered** → `rulebook knowledge add anti-pattern "<title>" --category <cat>`
   - **Debugging insights** → `rulebook learn capture --title "<title>" --content "<what you learned>"`
   - If nothing significant was learned, record at minimum: `rulebook learn capture --title "Completed <task-id>" --content "Implemented <summary>. No unexpected issues."`

**Reference**
- Use `rulebook task show <task-id>` when additional context is required
- Use `rulebook task validate <task-id>` to check format before archiving
- See `/.rulebook/specs/RULEBOOK.md` for complete task management guidelines and priority order
<!-- RULEBOOK:END -->

