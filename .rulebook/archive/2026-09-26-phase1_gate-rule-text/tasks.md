## 1. Implementation
- [x] 1.1 Add the gate sentence as the first sentence of `## Orchestration` in `templates/core/claude-md.md` (design line break)
- [x] 1.2 Apply the 11 design trims to `templates/core/claude-md.md` without dropping a rule; confirm context budget ≤ 1600 (spare edit F only if needed)
- [x] 1.3 Add `## 3. Entry gate (Jev)` to `templates/core/orchestration.md` and renumber later sections 4–7
- [x] 1.4 Regenerate this repo's `CLAUDE.md` and `.rulebook/specs/orchestration.md` from the templates (AGENTS.md unchanged)
- [x] 1.5 Add the `entry gate (v7.4)` block to `tests/directive-guards.test.ts`

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (the orchestration spec section itself)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass
