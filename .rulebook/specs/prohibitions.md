<!-- PROHIBITIONS:START -->
<!-- TIER1_PROHIBITIONS:START -->
# Absolute Prohibitions (Tier 1 — Highest Precedence)

These override all other rules.

## 1. No shortcuts, stubs, or simplified logic

No TODO/FIXME/HACK comments, no stubs or placeholder returns, no silently
reduced scope, no partial implementations. Implement completely — every edge
case and error path — or explain concretely why you can't. Correct beats fast.

## 2. No destructive git operations without explicit user authorization

Forbidden: `stash`, `rebase`, `reset --hard`, `checkout -- .` / `restore .`,
`revert`, `cherry-pick`, `merge`, `branch -D`, `push --force`, `clean -f`,
`checkout <branch>` / `switch`. Always safe: `status`, `diff`, `log`, `blame`,
`add`, `commit`. Multiple AI sessions may share this working tree — destructive
operations affect all of them.

## 3. No deletion without authorization

Never `rm`/`del` any file without an explicit user "yes, delete it". Caches
auto-invalidate; build artifacts have clean commands; investigate locks before
touching them.

## 4. Research before implementing — never guess

State what you KNOW and what you DON'T KNOW, research the unknown (read
source, check docs, run diagnostics), then implement. "I think this might be
the problem" is not acceptable; "source X does Y at file:line, we do Z, the
difference causes W" is.

## 5. No deferred tasks

A checklist item is implemented, not postponed. If a dependency blocks it,
implement the dependency first. If truly impossible, explain why concretely
and propose an alternative.

## 6. Follow task sequence

Execute `tasks.md` items in the exact listed order — first unchecked item of
the lowest-numbered phase. No reordering, no cherry-picking, no starting phase
N+1 before phase N is complete. The list is an order, not a menu.
<!-- TIER1_PROHIBITIONS:END -->
<!-- PROHIBITIONS:END -->