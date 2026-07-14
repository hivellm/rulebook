## 1. Implementation
- [x] 1.1 start returns CONTEXT + TASK blocks + last 3 history entries (4KB cap fallback for marker-less files)
- [x] 1.2 end rotates history beyond 20 entries to .rulebook/archive/plans-history.md
- [x] 1.3 templates/core/plans.md reworded to optional-scratchpad semantics

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG (batched)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass — suite green: 845 tests
