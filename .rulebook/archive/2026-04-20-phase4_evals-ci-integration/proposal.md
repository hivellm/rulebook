# Proposal: phase4_evals-ci-integration

Source: docs/analysis/caveman/03-evaluation.md

## Why

The three-arm harness is only useful if it runs automatically on every change that could affect results. Otherwise the numbers go stale and a regression (rule loses lift, new skill fails to beat `terse`) ships silently. GitHub Actions can run the offline measurement (`measure.ts`) on every PR touching SKILL.md/rules, post a delta-table comment, and gate merges on the lift threshold. Snapshot regeneration stays manual (needs API credentials) — the CI path uses committed snapshots.

## What Changes

- `.github/workflows/evals-measure.yml` — triggers on PRs touching `templates/skills/**`, `templates/rules/**`, or `evals/**`. Runs `measure.ts`, posts a PR comment with per-skill delta table. Fails the check if lift over `terse` drops below the configured threshold.
- `.github/workflows/evals-snapshot.yml` — manual-dispatch workflow that regenerates snapshots when an approver has API credentials (GitHub Actions secret `ANTHROPIC_API_KEY`). Commits back to the PR branch.
- `evals/README.md` — contributor docs: how to run measurement locally, how to regenerate snapshots, how to add a prompt.

## Impact

- Affected specs: none
- Affected code: `.github/workflows/*` (new)
- Breaking change: NO
- User benefit: Regressions in rule/skill effectiveness caught at PR time; no dead-weight rules ship.
