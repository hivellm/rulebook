## 1. Implementation

- [x] 1.1 Add `!/.rulebook/archive/`, `decisions/`, `knowledge/`, `learnings/` to the generated block; drop the redundant `tasks/**/*.md`
- [x] 1.2 Rewrite `ensureGitignore()` to strip prior-release lines and re-emit the block, so existing projects upgrade instead of hitting the early return
- [x] 1.3 Confirm runtime data (backup, logs, telemetry, handoff, PIDs, STATE/PLANS) stays ignored
- [x] 1.4 Apply to this repo and confirm the accumulated knowledge/learnings become visible to git

## 2. Tail (docs + tests — check or waive with tailWaiver)

- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior — keep/ignore asserted against real `git check-ignore`, plus upgrade-from-old-block and idempotence
- [x] 2.3 Run tests and confirm they pass
