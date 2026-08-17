# Proposal: phase12_worktree-git-destruction-guard

Source: field incident, 2026-08-17 — the `.git` of a consumer repo
(`ar-database-sync`) was destroyed during agent worktree work. Recovery cost:
15 commits collapsed into one, a diverged `origin/main` needing
`merge -s ours`, and ~8,849 rows of `identity.credential` left undecryptable
because the lost `SYNC_CREDENTIAL_KEY` had to be reissued as `KEY_ID=v2`.
Pre-incident reflog is gone.

## Why

Rulebook blesses `git worktree` as unconditionally autonomous in three
generated surfaces, with zero constraints attached:

- `templates/core/claude-md.md:31` — "Yours autonomously: … `git worktree`"
- `templates/core/prohibitions.md:19` — "`git worktree` for parallel work"
- `templates/git/git-workflow.md:21,40` — "use `git worktree`", "prefer
  `git worktree` for parallel agents"

That blessing is the only mention worktrees get. It grants the whole
lifecycle — create, place, clean up — while the prohibitions that would bound
the cleanup (Tier 1 #3, "no deletion without authorization") read as
superseded by the explicit autonomy grant. An agent following the rulebook
literally is authorized to remove a worktree it created, and nothing tells it
where a worktree may live or how it may be removed.

**What the incident was NOT** (verified by reproduction on git 2.x, disposable
repos — every case left `.git` intact):

| Attempted | Result |
|---|---|
| `git worktree add ""` | `fatal: '' is not a valid branch name` |
| `git worktree add "" main` | `fatal: invalid reference: main` |
| `git worktree add .` / `..` | `fatal: '.' is not a valid branch name` |
| `git worktree add --force ""` | same refusal |
| `git worktree remove --force <main wt>` | `fatal: … is a main working tree` |
| `rm -rf <linked wt>` + `git worktree prune` | main repo intact |

`git worktree add` cannot itself delete a `.git` — git refuses every
degenerate path, and `worktree remove` refuses the main worktree. So a
directive phrased as "validate the path passed to `worktree add`" would guard
a door that git already locks, and miss the one that is open.

**Where the hazard actually is** — `git worktree add ./wt` happily places the
worktree *inside* the repository working tree, and its `.git` is a *file*
pointing back at `…/demo/.git/worktrees/wt` (both confirmed by reproduction).
A worktree nested under the repo root means every subsequent cleanup of "the
worktree" — an `rm -rf` on a variable that resolved empty or to the wrong
level, a harness auto-cleanup, a tidy-up of the parent — is one path
component away from taking the repo root, and `.git` with it. Destruction
comes from the cleanup step operating on an unvalidated path, not from git.

## What Changes

Add worktree lifecycle discipline to the three template surfaces, then
regenerate the mirrors (`.rulebook/specs/git.md`,
`.rulebook/specs/prohibitions.md`, `CLAUDE.md`). The rules to encode:

1. **Placement** — a worktree goes in a sibling directory outside the
   repository working tree (`../<repo>-wt-<name>`), never nested under the
   repo root, never the repo root itself.
2. **Removal** — remove via `git worktree remove` (which refuses the main
   worktree) then `git worktree prune`. Never `rm -rf` a worktree path.
3. **Recursive deletion of a computed path** — requires the path to be
   verified non-empty and not the repo root before it runs; otherwise it needs
   the same explicit authorization as any other destructive git operation.
   This closes the reading under which the worktree blessing exempted cleanup
   from Tier 1 #3.
4. **`.git` itself** — deleting, moving, or overwriting a `.git` directory is
   Tier 1 prohibited without exception; no task ever legitimately requires it.

Always-on budget: CLAUDE.md carries the placement + removal rule only (the
short form); the full rationale lives in the on-demand git spec. Current
always-on is 1,678 of 2,500 tokens, so the addition fits with room to spare,
but `node scripts/measure-overhead.mjs` must still confirm ALL BUDGETS PASS.

## Impact

- Affected specs: `.rulebook/specs/git.md`, `.rulebook/specs/prohibitions.md`
- Affected code: `templates/core/claude-md.md`,
  `templates/core/prohibitions.md`, `templates/git/git-workflow.md`,
  generator tests, `CHANGELOG.md`
- Breaking change: NO — additive directive text; no API or config change
- User benefit: the failure mode that cost a consumer repo its history and an
  encryption key is ruled out by the directive that currently permits it
