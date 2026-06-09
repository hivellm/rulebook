# Spec: config-features

## REMOVED Requirements

### Requirement: Dead feature flags removed from RulebookFeatures
The `RulebookFeatures` config surface MUST NOT expose `watcher`, `agent`,
`notifications`, `dryRun`, `repl`, or `plugins`. Legacy `rulebook.json` files
that still contain these keys MUST be normalized (ignored) without error.

#### Scenario: Legacy config with removed flags loads cleanly
Given a `rulebook.json` whose `features` block contains `watcher: false` and `repl: true`
When the config manager loads it
Then the removed keys are dropped from the in-memory config
And no error or warning aborts the load

#### Scenario: Generators no longer read removed flags
Given the generators run during `rulebook init`
When output is produced
Then no generator branch reads `watcher`, `agent`, `notifications`, `dryRun`, `repl`, or `plugins`

## ADDED Requirements

### Requirement: Ralph purge migration retained
The update path MUST continue to remove Ralph residue from existing projects.

#### Scenario: Update removes Ralph residue
Given a project containing `.rulebook/ralph/` and `.rulebook/scripts/ralph-history.sh`
When `rulebook update` runs
Then `.rulebook/ralph/` is removed
And `.rulebook/scripts/ralph-*.{sh,bat}` are removed
