# Rulebook — dead module removal

## REMOVED Requirements

### Requirement: Dead core modules
The system SHALL NOT ship `src/core/telemetry.ts`, `src/core/auto-fixer.ts`,
`src/core/review-manager.ts`, `src/core/watcher.ts`, or
`src/core/compact-context-manager.ts`. The `telemetry` config block MUST be
removed from `config-manager.ts` and any consumers.

#### Scenario: Files removed
Given the post-change tree
When a developer searches `src/core/` for the deleted filenames
Then no match is found.

#### Scenario: Type-check passes
Given the modules removed and their imports stripped
When `npm run type-check` runs
Then it exits 0 with no unresolved-import errors.

#### Scenario: Compact context behaviour preserved
Given a fresh `rulebook init` after removal
When the user triggers Claude Code's native `/compact`
Then the compaction works using the standard `CLAUDE.md` imports
And no `.rulebook/COMPACT_CONTEXT.md` is required.
