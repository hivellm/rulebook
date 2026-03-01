# Spec: RalphParser Quality Gate Detection

## Type-Check Gate

- SHALL parse TypeScript compiler output for `error TS\d+` pattern
- SHALL count occurrences; gate passes if count === 0
- SHALL NOT fail on messages containing "error" as a substring without TS error code

## Lint Gate

- SHALL parse ESLint output for `\d+ problems \((\d+) errors,` pattern
- SHALL extract error count from pattern; gate passes if errors === 0
- SHALL treat "0 errors" output as success
- SHALL treat "no problems" as success

## Test Gate

- SHALL parse vitest output: `(\d+) failed` → fail if > 0
- SHALL parse jest output: `Tests: (\d+) failed` → fail if > 0
- SHALL treat `✓ X passing` with no failing tests as success
- SHALL NOT fail when output contains "error" not associated with test failure

## Coverage Gate

- SHALL delegate to `parseCoveragePercentage()` for percentage extraction
- SHALL fail if coverage percentage < configured threshold
- SHALL treat parsing failure as non-blocking (warn + skip)

## General Requirements

- All gate detection SHALL be case-insensitive where appropriate
- MUST return structured `QualityCheckResult` with `passed: boolean` and `details: string`
