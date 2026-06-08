## 1. Dead feature flags

- [ ] 1.1 Remove `watcher`, `agent`, `notifications`, `dryRun`, `repl`, `plugins` from `RulebookFeatures` in `src/types.ts`
- [ ] 1.2 Remove their defaults and normalization from `src/core/state/config-manager.ts`
- [ ] 1.3 Remove their handling from the `config` CLI command (`src/cli/commands/config.ts`)
- [ ] 1.4 Remove any generator/template reads of the six flags; confirm none remain via grep
- [ ] 1.5 Normalize legacy configs: ignore the removed keys without throwing

## 2. Ralph residue

- [ ] 2.1 Confirm no Ralph feature code, types, or CLI commands remain in `src/` (grep)
- [ ] 2.2 Keep the Ralph purge migration in `update.ts`/`config-manager.ts`; add a regression test asserting it removes `.rulebook/ralph/` and `.rulebook/scripts/ralph-*`
- [ ] 2.3 Remove any committed Ralph artifacts outside `dist/`

## 3. Tail (mandatory — enforced by rulebook v5.3.0)

- [ ] 3.1 Update or create documentation covering the implementation
- [ ] 3.2 Write tests covering the new behavior
- [ ] 3.3 Run tests and confirm they pass
