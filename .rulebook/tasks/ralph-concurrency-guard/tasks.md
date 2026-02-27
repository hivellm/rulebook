## 1. Lockfile Concurrency Guard
- [ ] 1.1 Add `acquireLock()` to RalphManager — write `.rulebook/ralph/ralph.lock` with PID+timestamp
- [ ] 1.2 Add `releaseLock()` to RalphManager — remove lockfile on completion/error
- [ ] 1.3 Add `isLocked()` to RalphManager — check if lock exists and PID is alive
- [ ] 1.4 Add stale lock detection — if PID is dead, auto-cleanup and allow new run
- [ ] 1.5 Guard `ralph_run` MCP handler — check lock before starting, return error if already running

## 2. Progress Feedback
- [ ] 2.1 Add progress logging in ralph_run loop — log iteration start/end to stderr and progress.txt
- [ ] 2.2 Update `ralph_status` MCP to report `running: true/false` and current task when lock is active
- [ ] 2.3 Return structured progress in ralph_run response — include per-iteration results as they complete

## 3. Signal Handling & Cleanup
- [ ] 3.1 Register process exit handler to release lock on SIGTERM/SIGINT/uncaught exception
- [ ] 3.2 Ensure lock is released in finally block of ralph_run handler

## 4. Testing
- [ ] 4.1 Test lock acquisition and release lifecycle
- [ ] 4.2 Test concurrent run rejection when lock is held
- [ ] 4.3 Test stale lock cleanup (dead PID)
- [ ] 4.4 Test status reports running state with active lock

## 5. Finalize
- [ ] 5.1 Update CHANGELOG
- [ ] 5.2 Bump version
