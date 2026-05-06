# Proposal: phase2_remove-cursor-mdc-generator

## Why

`src/core/cursor-mdc-generator.ts` (~64 LOC) writes `.cursor/rules/*.mdc`
files, the legacy Cursor IDE rule format. Cursor has since moved to the
shared `AGENTS.md` standard that this project already generates, so the
`.mdc` files are duplicated guidance that drifts from the source of truth.

Keeping the generator costs:
- Two formats of the same rules to maintain.
- A `templates/ides/cursor-mdc/` template tree (currently includes a
  `ralph.mdc` file we already plan to delete).
- An `init.ts` step that runs on every fresh install.

Removing it leaves Cursor users with `AGENTS.md`, which Cursor reads
natively today.

## What Changes

- Delete `src/core/cursor-mdc-generator.ts`.
- Delete `templates/ides/cursor-mdc/` in full (including any non-ralph
  `.mdc` files; the ralph one is removed by the ralph task but this task
  removes the directory).
- Delete `.cursor/rules/*.mdc` from the repo (project's own Cursor config).
- Remove the cursor-mdc step from `src/cli/commands/init.ts` and any
  re-export from `src/index.ts`.
- Update README / docs to point Cursor users at `AGENTS.md`.
- Delete `tests/cursor-mdc*.test.ts`.

## Impact

- Affected specs: documentation only.
- Affected code:
  - Deleted: `src/core/cursor-mdc-generator.ts`,
    `templates/ides/cursor-mdc/**`, `.cursor/rules/*.mdc`
  - Modified: `src/cli/commands/init.ts`, `src/index.ts`, `README.md`
  - Tests removed: `tests/cursor-mdc*.test.ts`
- Breaking change: minor — Cursor users on `.mdc` workflows lose the
  generator. They retain `AGENTS.md`, which Cursor reads natively.
  Document in CHANGELOG and the release notes.
- User benefit: one IDE-specific generator removed; AGENTS.md remains the
  single source of truth.
