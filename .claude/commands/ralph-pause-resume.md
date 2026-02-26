---
name: /ralph-pause-resume
id: ralph-pause-resume
category: Ralph
description: Pause and resume Ralph autonomous loop for manual intervention or debugging.
---
<!-- RALPH:START -->
**Overview**
Control Ralph's iteration loop by pausing and resuming execution:
- **Pause**: Stop after current iteration completes, allows manual inspection or fixes
- **Resume**: Continue from where paused, picking up with next incomplete story

**Guardrails**
- Pause completes current iteration before stopping (safe operation)
- Loop can only be resumed from paused state
- Use pause when: debugging failures, making manual fixes, investigating quality issues
- Keep pause duration short - long pauses may lose AI context

**Steps**

### Pausing the Loop

1. **Pause Ralph**:
   ```bash
   rulebook ralph pause
   ```
   - Completes current iteration
   - Stops before next iteration starts
   - Preserves all progress and iteration records

2. **Verify Paused State**:
   ```bash
   rulebook ralph status
   ```
   Should show: `Paused: true`

3. **Investigate Issues** (while paused):
   - Review latest iteration: `rulebook ralph history --iteration <N>`
   - Check quality gate failures: `rulebook ralph show <story-id>`
   - Review error logs and learnings
   - Make manual fixes to code if needed

### Resuming the Loop

1. **Resume Ralph**:
   ```bash
   rulebook ralph resume
   ```
   - Continues from where paused
   - Picks up with next incomplete story
   - Maintains iteration count and progress

2. **Verify Running State**:
   ```bash
   rulebook ralph status
   ```
   Should show: `Paused: false`

3. **Monitor Resumed Iterations**:
   ```bash
   rulebook ralph history --limit 3
   ```
   Check latest iterations to ensure resumption succeeded

**Common Workflows**

### Debugging Quality Gate Failures
1. Loop running, tests fail in iteration 5
2. `rulebook ralph pause` - stops after iteration 5
3. Analyze: `rulebook ralph history --iteration 5`
4. Identify test failure root cause
5. Make manual code fixes
6. `rulebook ralph resume` - continues from iteration 6

### Making Manual Adjustments
1. Pause loop: `rulebook ralph pause`
2. Manually edit code based on iteration learnings
3. Update PRD: `vi .rulebook/ralph/prd.json`
4. Resume: `rulebook ralph resume` - continues with updated PRD

### Inspecting AI Tool Output
1. Pause: `rulebook ralph pause`
2. Check `rulebook ralph history --iteration <N>` for AI output
3. Review learnings and errors from iteration
4. Resume: `rulebook ralph resume`

**Pause vs Stopping**
- **Pause** (`ralph pause`): Loop continues later with resume
- **Stop** (Ctrl+C during run): Stops immediately, may interrupt current iteration
- Use pause for graceful, resumable stops
- Use Ctrl+C only for emergency stops

**State Preservation**
When paused:
- Current iteration status saved
- User story states preserved
- Learnings and errors recorded
- Loop progress not lost

**Edge Cases**
- **Can't pause if not running**: Check with `ralph status`
- **Can't resume if not paused**: Call `ralph run` instead
- **Resuming after long pause**: Ralph retains context up to max iterations allowed

<!-- RALPH:END -->
