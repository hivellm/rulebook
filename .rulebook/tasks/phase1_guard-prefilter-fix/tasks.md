## 1. Implementation
- [ ] 1.1 Payload corpus fixture from real transcripts (redacted, Bash/Edit/Write, incl. prose with " at "/batch/.timer)
- [ ] 1.2 Field-scoped prefilter in no-os-scheduling.sh (command / file_path only)
- [ ] 1.3 Builtin read instead of $(cat) in both guards
- [ ] 1.4 Parity test: existing deny cases still deny; fast path ≥ 95 % on corpus; 0 false denials
- [ ] 1.5 Re-measure with the hook harness (median of 3) and record before/after in the analysis ledger

## Tail (docs + tests — check or waive with tailWaiver)
- [ ] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs)
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass (type-check → lint → tests)
