# Tasks: F5 — Fail-twice-escalate rule

## 1. Template
- [x] 1.1 Created `templates/rules/fail-twice-escalate.md` with rule body, rationale (UzEngine RULE -3 + paper §6), definition of "same approach" vs "different approach", and interaction notes with other rules
- [x] 1.2 Added to `ALWAYS_ON_RULES` in `src/core/rules-generator.ts` — always-on, no paths: frontmatter

## 2. Tail (mandatory)
- [x] 2.1 Documentation: rule file is self-documenting with field evidence
- [x] 2.2 Tests: covered by rules-generator.test.ts (ALWAYS_ON_RULES emission)
- [x] 2.3 Full suite passing, lint clean, type-check clean
