# Task archive moves specs/ subdirectory — tests must resolve active OR archive
**Source**: manual
**Date**: 2026-04-20
**Related Task**: phase0_terse-foundations
**Tags**: testing, archive, task-workflow, rulebook-terse
When `rulebook_task_archive` fires, it moves the entire task directory from `.rulebook/tasks/<id>/` to `.rulebook/archive/<YYYY-MM-DD>-<id>/`, including the `specs/` subdirectory. Tests that pin invariants on task-delta spec files break after archive because the path no longer exists.

Fix pattern (used in `tests/rulebook-terse-foundations.test.ts`):

```ts
function resolveDeltaPath(): string | null {
  const active = resolve(ROOT, `.rulebook/tasks/${taskId}/specs/${mod}/spec.md`);
  if (existsSync(active)) return active;
  const archiveRoot = resolve(ROOT, '.rulebook/archive');
  if (!existsSync(archiveRoot)) return null;
  const match = readdirSync(archiveRoot)
    .filter(d => d.endsWith(`-${taskId}`))
    .sort().reverse()[0];
  return match ? resolve(archiveRoot, match, `specs/${mod}/spec.md`) : null;
}
```

The test passes during implementation (active path exists) AND after archive (fallback resolves to most recent archive entry matching the task id). Alternative would be to promote the invariant into a test of the main project spec `.rulebook/specs/<MODULE>.md` — that's cleaner but only works after the archive mechanism folds deltas into the main spec, which currently happens manually.