---
name: /ralph-status
id: ralph-status
category: Ralph
description: Check the status of Ralph autonomous loop and view task completion statistics.
---
<!-- RALPH:START -->
**Overview**
View the current state of Ralph's autonomous loop, including:
- Loop enabled/disabled status
- Current iteration count and max iterations
- Paused/running state
- User story completion statistics
- Overall project progress

**Guardrails**
- Status shows real-time state from `.rulebook/ralph/config.json` and `prd.json`
- Use status regularly to monitor loop health
- Paused state prevents iterations from continuing (must resume to continue)

**Steps**
1. **Check Ralph Status**:
   ```bash
   rulebook ralph status
   ```

2. **Interpret Output**:
   ```
   Ralph Status:
   ├─ Enabled: true
   ├─ Current Iteration: 3
   ├─ Max Iterations: 10
   ├─ AI Tool: claude
   ├─ Paused: false
   ├─ Task Statistics:
   │  ├─ Total Stories: 5
   │  ├─ Completed: 2
   │  ├─ Pending: 3
   │  └─ Completion: 40%
   └─ Branch: ralph/my-project
   ```

3. **Status Fields**:
   - **Enabled**: Whether Ralph loop is active
   - **Current Iteration**: Which iteration loop is on (0 = not started)
   - **Max Iterations**: Total iterations allowed before stopping
   - **AI Tool**: Which AI tool is being used (claude, cursor, gemini)
   - **Paused**: Whether loop is paused (must resume to continue)
   - **Task Statistics**: User story completion breakdown
   - **Branch**: Git branch Ralph is working on

4. **Check Completion**:
   ```bash
   # View detailed task statistics
   rulebook ralph status --detailed
   ```
   Shows individual user story status and completion breakdown

**Common Patterns**
- **Just initialized**: `Current Iteration: 0`, `Pending: <all stories>`
- **In progress**: `Current Iteration: N` increasing, `Pending` decreasing
- **Complete**: `Current Iteration` matches total completed stories, `Pending: 0`
- **Paused**: `Paused: true`, resume with `rulebook ralph resume`

**Next Steps**
- If loop not started: `rulebook ralph run`
- If paused: `rulebook ralph resume`
- To view iterations: `rulebook ralph history`
- To view story details: `rulebook ralph show <story-id>` (if available)

**Troubleshooting**
- **Status shows disabled**: Run `rulebook ralph init` to enable
- **Iteration count stuck**: Check if loop is paused or if max iterations reached
- **Statistics don't match**: Check `.rulebook/ralph/prd.json` for consistency

<!-- RALPH:END -->
