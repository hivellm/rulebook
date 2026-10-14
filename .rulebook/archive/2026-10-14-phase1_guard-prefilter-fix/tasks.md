## 1. Implementation
- [x] 1.1 Payload corpus fixture from real transcripts (redacted, Bash/Edit/Write, incl. prose with " at "/batch/.timer) — tests/fixtures/guard-payloads/corpus.json, 55 cases modelled on transcript calls
- [x] 1.2 Field-scoped prefilter in no-os-scheduling.sh (command / file_path only) — heredoc bodies skipped too
- [x] 1.3 Builtin read instead of $(cat) in both guards — `read -N` (block reads), `-d ''` fallback for bash 3.2
- [x] 1.4 Parity test: existing deny cases still deny; fast path ≥ 95 % on corpus; 0 false denials — tests/guard-payload-corpus.test.ts (97 % fast, 0 false denials, 19/19 denials)
- [x] 1.5 Re-measure with the hook harness (median of 3) and record before/after in the analysis ledger — 01-measured-overhead.md F-003

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs) — README; CHANGELOG bullets handed to the release step
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
