# Write tests in small batches, verify immediately

# Incremental Test Development

Write tests 1-3 at a time. Test immediately after writing. Fix errors before proceeding.

## Rules

1. **Write 1-3 tests** at a time, NOT entire test files at once
2. **Run immediately** after writing — use single-file test execution
3. **Fix errors** before writing more tests
4. **Never run full suite** while developing tests — use individual file execution
5. **Coverage updates** only after completing a block of tests

## Why

Writing full test files at once leads to cascading failures. One early error invalidates all subsequent tests, creating debug fatigue and wasted time.

## Development Testing vs Validation Testing

- **Development**: Run single test file (`vitest run tests/my.test.ts`)
- **Validation**: Run full suite only when a batch of tests is complete
