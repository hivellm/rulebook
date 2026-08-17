# Proposal: phase15_share-project-memory-in-git

Source: user report, 2026-08-17 — project memory never reaches collaborators.

## Why

The generated `.gitignore` block ignores `.rulebook/` wholesale and names only
four exceptions:

```
/.rulebook/*
!/.rulebook/specs/
!/.rulebook/tasks/
!/.rulebook/tasks/**/*.md
!/.rulebook/rulebook.json
```

`git check-ignore -v` on a real project confirms the consequence:

| Path | Result |
|---|---|
| `.rulebook/decisions/x.md` | ignored by `/.rulebook/*` |
| `.rulebook/knowledge/patterns/x.md` | ignored by `/.rulebook/*` |
| `.rulebook/learnings/x.md` | ignored by `/.rulebook/*` |
| `.rulebook/archive/…/proposal.md` | ignored — kept in THIS repo only because the line was hand-added |

Decisions, knowledge and learnings are exactly the material a second person
needs: why a choice was made, which patterns hold, what was learned the hard
way. `rulebook_memory` writes them, agents read them, and git drops them at the
door — so every collaborator and every fresh clone starts blind. The archive is
the same: completed tasks are the record of what shipped and why.

This repo has accumulated 7 knowledge entries and 8 learnings that were never
committed, which is the bug in its own evidence.

## What Changes

Add the four missing exceptions. Verified with real `git check-ignore` that
negating the directory is sufficient — git then evaluates the files inside it,
so `**` patterns are unnecessary and `!/.rulebook/tasks/**/*.md` goes away as
redundant:

```
/.rulebook/*
!/.rulebook/specs/
!/.rulebook/tasks/
!/.rulebook/archive/
!/.rulebook/decisions/
!/.rulebook/knowledge/
!/.rulebook/learnings/
!/.rulebook/rulebook.json
```

Runtime data stays ignored by the catch-all: `backup/`, `logs/`, `telemetry/`,
`handoff/`, PID files, `STATE.md`, `PLANS.md`.

The second half matters as much as the first: `ensureGitignore()` returned early
whenever the file already contained `!/.rulebook/specs/` and
`!/.rulebook/tasks/**/*.md`, so every existing project would have been skipped
and the fix would only ever have reached new ones. The block is now rewritten
from scratch on each call — lines from any past release are stripped first —
which is both idempotent and self-upgrading.

## Impact

- Affected specs: none
- Affected code: `src/core/state/config-manager.ts`, `tests/config-manager.test.ts`
- Breaking change: NO — strictly un-ignores; nothing previously committed stops being committed
- User benefit: decisions, knowledge, learnings and the task archive travel with
  the repo, which is the point of writing them down
