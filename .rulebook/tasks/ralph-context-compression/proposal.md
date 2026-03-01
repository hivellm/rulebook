# Proposal: Ralph Context Compression for Long-Running Loops

## Context

Ralph autonomous loop injects full iteration history into each new iteration's context. After 5+ iterations, this context can exceed 50k tokens, causing:
- Slow responses due to large context windows
- Context window exceeded errors in some AI tools
- Diminishing returns as old iteration details are rarely useful

The solution is context compression: summarize old iterations instead of passing them verbatim.

## Solution

Implement a two-tier context management strategy:

1. **Recent (N=3)**: Include full details for the last 3 iterations
2. **Historical (N>3)**: Summarize older iterations into a compressed format:
   ```
   Iteration 1-4 Summary:
   - US-001: Fixed auth validation. Learned: always validate JWT expiry
   - US-002: Failed type-check 3 times. Root cause: missing null checks in UserService
   - Quality gates: lint failed on iterations 2-3 due to unused imports
   ```

3. **Smart compression**: Use the memory system's BM25 search to retrieve only relevant past learnings instead of all iterations

## Configuration

```json
"ralph": {
  "contextCompression": {
    "enabled": true,
    "recentIterations": 3,
    "compressionThreshold": 5
  }
}
```

## Files to Modify

- `src/core/ralph-manager.ts` — implement context compression logic
- `src/core/iteration-tracker.ts` — add `summarizeIterations()` function
- `src/core/config-manager.ts` — add contextCompression config
- `tests/ralph-context-compression.test.ts` — new test file
