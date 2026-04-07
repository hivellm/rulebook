# Proposal: F3 — `.rulebook/STATE.md` auto-regeneration

Source: [docs/analysis/v5.3.0/04-features.md#f3](../../../docs/analysis/v5.3.0/04-features.md)

## Why
tml hand-maintains `STATE.md`; project-v has none. Session continuity is broken — `rulebook continue` skill has no anchor in most projects. STATE.md must become a machine-written file imported by CLAUDE.md, automatically updated by the task and Ralph subsystems.

## What Changes
- New `src/core/state-writer.ts` renders a short (<40 line) STATE.md on every task/Ralph state change.
- Content includes: active task, current phase, last Ralph iteration, last quality gate result, project health score.
- Hooked into `task-manager.ts` (create/update/archive) and `ralph-manager.ts` (iteration end).
- Frontmatter `manual: true` opt-out for users who want to hand-maintain.
- CLAUDE.md template imports `@.rulebook/STATE.md` (delivered via F1).

## Impact
- Affected specs: `.rulebook/STATE.md` schema documented in `templates/core/`
- Affected code: new `src/core/state-writer.ts`, `src/core/task-manager.ts`, `src/core/ralph-manager.ts`
- Breaking change: NO
- User benefit: every session resumes with accurate context; no more stale or missing STATE.md
