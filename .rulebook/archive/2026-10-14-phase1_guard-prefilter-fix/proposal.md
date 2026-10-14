# Proposal: phase1_guard-prefilter-fix

## Why
The two PreToolUse guards spawn on every Bash/Edit/Write call and their keyword prefilter matches the whole payload (descriptions, edit text, file contents), so ordinary prose (" at ", "batch", ".timer") sends 4.7 % of Bash, 15.3 % of Edit and 48.2 % of Write calls down a slow path costing +215–242 ms, and caused 3 false denials (docs/analysis/multi-session-performance/01-measured-overhead.md F-001, F-002, F-003).

## What Changes
- Extract `tool_input.command` and `tool_input.file_path` first; match scheduler keywords only against those fields.
- Read stdin with the bash builtin `read` instead of `$(cat)`.
- Build a corpus of real payloads (from transcripts, redacted) and a parity test: same denials as today on the deny cases, fast path on ≥ 95 % of the corpus, 0 false denials.
- Keep the `allow` output unchanged here (decided in phase2_guards-to-permissions, Q3).

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: templates/hooks/no-os-scheduling.sh, templates/hooks/protect-task-scaffolding.sh, .claude/hooks/ copies, tests/os-scheduling-guard.test.ts, tests/fixtures (payload corpus)
- Breaking change: NO
- User benefit: −170 to −220 ms on every call that hits the slow path today; no false denials on prose.
