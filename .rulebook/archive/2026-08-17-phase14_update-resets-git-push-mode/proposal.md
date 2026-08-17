# Proposal: phase14_update-resets-git-push-mode

Source: found while running `rulebook update` on this repo during phase12.

## Why

`rulebook update` silently resets a project's git push mode to `manual`.

`generateGitRules(pushMode)` stamps the mode into `.rulebook/specs/git.md`,
and its only caller reads the value from config:

```ts
// src/core/generators/generator.ts:903
const gitRules = await generateGitRules(mergedConfig.gitPushMode || 'manual');
```

But `gitPushMode` is never persisted. `.rulebook/rulebook.json` in this repo
has no such key (`grep pushMode .rulebook/rulebook.json` → no match), so
`mergedConfig.gitPushMode` is `undefined` on every update and the `|| 'manual'`
fallback wins.

Observed here: `.rulebook/specs/git.md` was on AUTO ("AI assistants may execute
push commands automatically"), and a plain `rulebook update` rewrote it to
MANUAL ("Never execute `git push` commands automatically"). No prompt, no
warning — the change is buried among the other regenerated files.

The direction of the flip is safe, so nothing breaks loudly. It is still wrong:
a project that deliberately chose AUTO loses that choice on every update, and
the only way to notice is reading the regenerated diff.

## What Changes

1. Persist `gitPushMode` in `.rulebook/rulebook.json` when it is chosen at
   `init` time.
2. On `update`, read the persisted value; when the key is absent, recover the
   mode from the existing `.rulebook/specs/git.md` header rather than
   defaulting, so repos updating from a version that never wrote the key keep
   what they have.
3. Keep `'manual'` as the default only for a genuinely new project with no
   prior git spec.

## Impact

- Affected specs: `.rulebook/specs/git.md` (the stamped header)
- Affected code: `src/core/generators/generator.ts`, config types, the init and
  update commands, tests
- Breaking change: NO — it stops an unintended reset
- User benefit: a configured push mode survives `rulebook update`
