## 1. Implementation
- [ ] 1.1 Machine-input detection + early return (no Jev call), with tests on real notification payloads
- [ ] 1.2 IDE/system block stripping before classification
- [ ] 1.3 renderInstruction: ask only on needsOperatorDecision; silent when ≥ 3 undecided
- [ ] 1.4 Trim the hook question set (drop skill/agent/model/parallel)
- [ ] 1.5 Metadata-only task listing for the gate; no migrateArchive on the read path
- [ ] 1.6 systemMessage once per session on missing CLI (marker file)
- [ ] 1.7 Deadline 1.5 s / timeout 3 s; replay the 50 logged prompts and record the ask-rate

## Tail (docs + tests — check or waive with tailWaiver)
- [ ] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs)
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass (type-check → lint → tests)
