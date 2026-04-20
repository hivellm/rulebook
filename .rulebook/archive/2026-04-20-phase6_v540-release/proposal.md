# Proposal: phase6_v540-release

Source: docs/analysis/caveman/05-rulebook-adoption-proposal.md

## Why

All preceding phases land behavior. This phase ships it: bumps `5.4.0-pre` → `5.4.0`, writes the complete CHANGELOG entry, updates README with the new skill family and `rulebook compress` CLI, publishes to npm. Also ships the migration note: existing 5.3.x projects run `rulebook update` and pick up the new skills; 5.2.x and earlier get a manual migration guide.

## What Changes

- `package.json` — version bump `5.4.0-pre` → `5.4.0`.
- `CHANGELOG.md` — replace `[5.4.0-pre] - unreleased` heading with `[5.4.0] - YYYY-MM-DD`, finalize content with real lift numbers from evals, real compression numbers from `rulebook compress` benchmarks, real incident-free validation window.
- `README.md` — add `rulebook-terse` skill, `rulebook compress` CLI, evals harness to feature list; update MCP tool count.
- `docs/analysis/caveman/README.md` — link back to v5.4.0 CHANGELOG entry.
- Publish: `npm run build && npm publish` (no `--no-verify`).

## Impact

- Affected specs: none (release-only)
- Affected code: `package.json`, `CHANGELOG.md`, `README.md`
- Breaking change: NO — v5.4.0 is additive over v5.3.x
- User benefit: Public release of all v5.4.0 capabilities.
