## 1. Implementation
- [x] 1.1 Machine-input detection + early return (no Jev call), with tests on real notification payloads
- [x] 1.2 IDE/system block stripping before classification
- [x] 1.3 renderInstruction: ask only on needsOperatorDecision; silent when ≥ 3 undecided
- [x] 1.4 Trim the hook question set (drop skill/agent/model/parallel)
- [x] 1.5 Metadata-only task listing for the gate; no migrateArchive on the read path
- [x] 1.6 systemMessage once per session on missing CLI (marker file)
- [x] 1.7 Deadline 1.5 s / timeout 3 s; replay the 50 logged prompts and record the ask-rate

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)

## Results
- Replay (tests/gate-replay.test.ts, 63 logged decisions: rulebook 54 + UzPainter 9): ask-rate 6.3 % (4/63), silent 8/63; the v7.4 rule asked on 61.9 % (39/63).
- State build at 90 tasks (metadata-only listing, median of 7): 3.1 ms (was 159–175 ms).
- CHANGELOG entry: written by the release step (phase4_v750-release); docs/MCP_SERVER.md updated here.
