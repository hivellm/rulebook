## 1. Implementation

- [x] 1.1 `templates/core/claude-md.md`: add `## Communication` — plain words over jargon, answer before reasoning, short explanations, length follows the work
- [x] 1.2 Check whether `templates/core/agents-lean.md` needs the same section, so the rule holds for tools that read AGENTS.md instead of CLAUDE.md
- [x] 1.3 Regenerate `CLAUDE.md` and confirm the sentinel block matches the template
- [x] 1.4 `node scripts/measure-overhead.mjs` → ALL BUDGETS PASS with phase12's addition also applied; record the ledger row
- [x] 1.5 `CHANGELOG.md` entry under 7.0.2

## 2. Tail (docs + tests — check or waive with tailWaiver)

- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior — generator test asserting the Communication section reaches the generated `CLAUDE.md`
- [x] 2.3 Run tests and confirm they pass
