---
name: /ralph-run
id: ralph-run
category: Ralph
description: Start Ralph autonomous loop to iteratively complete tasks from the PRD.
---
<!-- RALPH:START -->
**Overview**
Ralph runs your configured AI tool in a continuous loop, solving user stories from the PRD one at a time. Each iteration:
1. Picks the next incomplete user story
2. Invokes your AI tool (Claude, Cursor, or Gemini) to solve it
3. Parses the output for quality checks and completion status
4. Records the iteration results
5. Marks the story as complete if all quality gates pass
6. Moves to the next story or stops if max iterations reached

**Guardrails**
- Ralph must be initialized first with `rulebook ralph init`
- Quality gates MUST pass: type-check, lint, tests, coverage
- Failed iterations are recorded but don't auto-mark stories complete
- Monitor logs and iteration history for quality issues

**Prerequisites**
- Ralph initialized with `rulebook ralph init`
- All quality gate tools installed: TypeScript, ESLint, test framework, coverage reporter
- `.rulebook/ralph/prd.json` exists with user stories

**Steps**
1. **Start the Loop**:
   ```bash
   rulebook ralph run
   ```
   Ralph will:
   - Load configuration and PRD
   - Find first incomplete story (`passes: false`)
   - Invoke your AI tool
   - Parse output for task completion and quality checks

2. **Monitor Execution**:
   - Watch the console for iteration progress
   - Each iteration shows: story ID, title, execution time, quality gate results
   - Ralph will pause on quality gate failures for review

3. **Review Iteration Results**:
   ```bash
   rulebook ralph history
   ```
   Shows:
   - Iteration number
   - Task ID and title
   - Success/partial/failed status
   - Quality check results (type-check, lint, tests, coverage)
   - Execution time
   - Errors and learnings

4. **Check Status**:
   ```bash
   rulebook ralph status
   ```
   Shows:
   - Current iteration count
   - Pending user stories count
   - Completion percentage
   - Paused state (if paused)

**Iteration Lifecycle**
1. **Iteration Start**: Ralph picks next incomplete story
2. **AI Tool Execution**: Runs your configured tool (Claude/Cursor/Gemini)
3. **Output Parsing**: Extracts quality checks, errors, completion indicators
4. **Quality Gates**:
   - type-check ✓ - TypeScript compilation succeeds
   - lint ✓ - ESLint passes without errors
   - tests ✓ - All test suites pass
   - coverage ✓ - Coverage meets thresholds
5. **Story Completion**: If all gates pass, marks `passes: true`
6. **Next Iteration**: Moves to next story or completes loop

**Quality Gate Failures**
If gates fail:
- Status recorded as `partial` or `failed`
- Story remains `passes: false` for retry
- Error details saved in iteration history
- Manual review and fixes may be needed before retry

**Pausing and Resuming**
- `rulebook ralph pause` - Pause after current iteration
- `rulebook ralph resume` - Continue from where paused
- Useful for investigating failures or making manual adjustments

**Iteration Records**
Each iteration is recorded in:
- `.rulebook/ralph/history/iteration-<N>.json` with full details
- Includes: task details, quality checks, errors, learnings, git commit

**Troubleshooting**
- **Loop stops early**: Check quality gate failures in latest iteration
- **AI tool not found**: Ensure `rulebook ralph config set ai-tool <tool>` is set correctly
- **Infinite loops**: Use `rulebook ralph pause` and check loop configuration
- **Context loss**: Ralph tracks context loss and reports it in iteration metadata

<!-- RALPH:END -->
