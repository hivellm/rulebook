## 1. Lockfile Concurrency Guard
- [x] 1.1 Add `acquireLock()` to RalphManager — write `.rulebook/ralph/ralph.lock` with PID+timestamp
- [x] 1.2 Add `releaseLock()` to RalphManager — remove lockfile on completion/error
- [x] 1.3 Add `isLocked()` to RalphManager — check if lock exists and PID is alive
- [x] 1.4 Add stale lock detection — if PID is dead, auto-cleanup and allow new run
- [x] 1.5 Guard `ralph_run` MCP handler — check lock before starting, return error if already running

## 2. Progress Feedback
- [x] 2.1 Add progress logging in ralph_run loop — log iteration start/end to stderr and progress.txt
- [x] 2.2 Update `ralph_status` MCP to report `running: true/false` and current task when lock is active
- [x] 2.3 Return structured progress in ralph_run response — include per-iteration results as they complete

## 3. Signal Handling & Cleanup
- [x] 3.1 Register process exit handler to release lock on SIGTERM/SIGINT/uncaught exception
- [x] 3.2 Ensure lock is released in finally block of ralph_run handler

## 4. Testing
- [x] 4.1 Test lock acquisition and release lifecycle
- [x] 4.2 Test concurrent run rejection when lock is held
- [x] 4.3 Test stale lock cleanup (dead PID)
- [x] 4.4 Test status reports running state with active lock

## 5. Finalize
- [x] 5.1 Update CHANGELOG
- [x] 5.2 Bump version
