# Proposal: phase1_remove-ralph-and-dead-flags

## Why

Cross-project usage analysis (8 projects with `.rulebook/`: Cortex, HiveGPU,
Nexus, Rulebook, Synap, Tml, TmlDocs, Vectorizer) shows two surfaces with zero
real adoption:

1. **Ralph (autonomous loop).** No project contains a single Ralph run or
   history log — only scaffolded `.rulebook/scripts/ralph-*.{sh,bat}`. The
   Ralph feature code was already removed from `src/` in a prior internal task
   (`phase2_remove-ralph-loop`); what remains is residual purge/migration code
   plus stale `dist/` build artifacts.
2. **Six `features` flags that are OFF in every sampled project**: `watcher`,
   `agent`, `notifications`, `dryRun`, `repl`, `plugins`. They add config,
   type, CLI and generator surface that nobody enables.

Removing both shrinks the config/type surface and finishes the Ralph removal.

## What Changes

- Remove the six dead flags (`watcher`, `agent`, `notifications`, `dryRun`,
  `repl`, `plugins`) end-to-end: `RulebookFeatures` in `src/types.ts`,
  config-manager defaults/normalization, the `config` CLI command, any
  generator/template that reads them, and the `rulebook.json` schema/docs.
- Keep the Ralph **purge migration** in `update.ts` / `config-manager.ts` (it
  cleans Ralph residue from existing user projects) but confirm no Ralph
  *feature* code, types, or CLI remain in `src/`.
- Drop stale Ralph build artifacts from any committed path (not `dist/`, which
  is gitignored and regenerated).

## Impact

- Affected specs: `specs/config-features/spec.md` (this task)
- Affected code: `src/types.ts`, `src/core/state/config-manager.ts`,
  `src/cli/commands/config.ts`, generators reading `features.*`, related tests
- Breaking change: YES — removes public `features` keys from `rulebook.json`
  (target release 6.0.0). Stale keys in existing configs are ignored/normalized
  away, not errored.
- User benefit: smaller, honest config surface; no dead Ralph scaffolding.
