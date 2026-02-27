# Proposal: Ralph Concurrency Guard & Progress Feedback

## Why

When `ralph_run` is invoked via MCP, it runs silently with no progress feedback. The calling AI has no indication that the loop is actively working, leading users to believe it failed and re-invoke it multiple times. This causes multiple Ralph processes running in parallel, consuming all system resources (CPU, memory) and nearly crashing the machine. There is no lock mechanism to prevent concurrent execution.

## What Changes

1. **Lockfile-based concurrency guard**: Ralph uses a `.rulebook/ralph/ralph.lock` file with PID to prevent multiple simultaneous runs. If a lock exists and the PID is alive, `ralph_run` returns an error immediately. Stale locks (dead PID) are cleaned up automatically.

2. **Progress streaming via MCP**: `ralph_run` returns periodic progress updates so the calling AI knows the loop is active. Include iteration number, current task, and elapsed time in each update.

3. **Progress logging to disk**: Write real-time progress to `.rulebook/ralph/progress.txt` so external tools and users can monitor execution via `ralph_status`.

4. **Status reflects running state**: `ralph_status` reports `running: true` with current task info when a loop is active, so the AI can check before starting a new run.

5. **Graceful lock cleanup**: Lock is released on normal completion, error, or process exit (via signal handlers).

## Impact
- Affected specs: none
- Affected code: `src/core/ralph-manager.ts`, `src/mcp/rulebook-server.ts`
- Breaking change: NO
- User benefit: Prevents resource exhaustion from parallel Ralph runs; provides visibility into loop execution status
