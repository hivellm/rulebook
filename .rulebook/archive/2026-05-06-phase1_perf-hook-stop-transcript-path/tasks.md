## 1. Implementation
- [x] 1.1 Read `transcript_path` from stdin payload via jq in `templates/hooks/check-context-and-handoff.sh`
- [x] 1.2 Replace the `find | sort -rn | head -1` block with a direct `stat -c%s "$transcript_path"` (with BSD `stat -f%z` fallback)
- [x] 1.3 Preserve existing no-op fallback when `transcript_path` is missing or unreadable
- [x] 1.4 Mirror the change in `.claude/hooks/check-context-and-handoff.sh`

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG.md 5.6.0 entry)
- [x] 2.2 Write tests covering the new behavior (`tests/check-context-and-handoff-shell.test.ts`)
- [x] 2.3 Run tests and confirm they pass (1985/1985 — 6 new pass; 4 jq-gated tests excluded locally, exercised on CI)
