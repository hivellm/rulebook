# Proposal: phase2_remove-complexity-detector

## Why

`src/core/complexity-detector.ts` (~371 LOC) estimates project complexity
(LOC, language count, build-target count) at `init` and `update` time, with
the original goal of calibrating which rule "tier" the project gets. In
practice, rules are generated statically from templates and the tier
recommendation is never fed back into anything — there is no dynamic
scaling of guidance based on the score.

The work is non-trivial (filesystem walk + heuristics) and runs on every
`init`/`update`, slowing the install with no observable effect on output.

## What Changes

- Delete `src/core/complexity-detector.ts`.
- Remove its imports + callsites from `src/cli/commands/init.ts`,
  `src/cli/commands/update.ts`, and `src/index.ts`.
- Remove any `complexity` field that leaks into `.rulebook/rulebook.json`
  (writer + reader paths in `config-manager.ts` / `state-writer.ts`).
- Drop the corresponding test file `tests/complexity-detector*.test.ts`.
- Audit any "tier recommendation" UX text that referenced the score and
  simplify it.

## Impact

- Affected specs: `RULEBOOK.md` if it documents complexity-driven tiers
  (likely needs a small edit).
- Affected code:
  - Deleted: `src/core/complexity-detector.ts`
  - Modified: `src/cli/commands/init.ts`, `src/cli/commands/update.ts`,
    `src/core/config-manager.ts`, `src/core/state-writer.ts`,
    `src/index.ts`
  - Tests removed: `tests/complexity-detector*.test.ts`
- Breaking change: NO functionally; existing `complexity` config blocks
  become inert and can be left in users' configs without error.
- User benefit: faster `init` / `update`; ~371 LOC removed.
