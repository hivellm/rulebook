# Proposal: version-bump-v4

## Why
All v4 features (Ralph shell scripts, MCP deduplication, per-project memory fix, multi-agent directives) constitute a major version release. Version must be bumped to 4.0.0 across all manifests, configs, and documentation to reflect the scope of changes.

## What Changes
- Bump `package.json` version from `3.4.2` to `4.0.0`
- Update `.claude-plugin/plugin.json` and `marketplace.json` versions
- Update version fallbacks in source code (commands.ts, config-manager.ts)
- Update `rulebook.json` config version in default templates
- Write CHANGELOG.md entry for v4.0.0 with all feature summaries
- Update migration logic in config-manager.ts for v3.x -> v4.0 transition

## Impact
- Affected specs: All version references
- Affected code: package.json, .claude-plugin/, src/cli/commands.ts, src/core/config-manager.ts
- Breaking change: YES (major version — MCP config format changes, memory path resolution)
- User benefit: Clear versioning, clean upgrade path from v3 to v4
