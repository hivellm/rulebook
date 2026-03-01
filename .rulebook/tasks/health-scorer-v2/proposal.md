# Proposal: Health Scorer v2 — Real Content Measurement

## Context

The current health scorer (`src/core/health-scorer.ts`) measures project health by checking if files **exist** (e.g., AGENTS.md exists → +10 points). This is a superficial check that doesn't measure actual quality:

- An empty AGENTS.md scores the same as a comprehensive one
- A test file with 1 test scores the same as one with 100 tests
- A README with "TODO" scores the same as a complete one

## Solution

Health Scorer v2 measures **content quality**, not just file existence:

| Metric | v1 (current) | v2 (proposed) |
|--------|-------------|---------------|
| AGENTS.md | exists → +10 | word count, spec references → 0-20 |
| Tests | test file exists → +10 | test count, coverage % → 0-20 |
| README | exists → +5 | section count, completeness → 0-10 |
| Types | types.ts exists → +5 | type coverage % → 0-10 |
| Git hooks | .git/hooks exist → +10 | hooks actually run → 0-10 |
| Ralph | ralph/ exists → +5 | stories completed, pass rate → 0-10 |
| Memory | memory.db exists → +5 | memory count, recent activity → 0-10 |

Total score: 0-100 with letter grades (A/B/C/D/F) and actionable recommendations.

## Files to Modify

- `src/core/health-scorer.ts` — full rewrite with content measurement
- `src/types.ts` — update HealthScore type with detailed breakdown
- `tests/health-scorer.test.ts` — update tests for new scoring
