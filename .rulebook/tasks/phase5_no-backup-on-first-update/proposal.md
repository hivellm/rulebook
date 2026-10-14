# Proposal: phase5_no-backup-on-first-update

## Why
The first rulebook update right after init writes a CLAUDE.md backup into .rulebook/backup even though nothing the user wrote changed, which adds noise and churn on every fresh project.

## What Changes
Back up CLAUDE.md only when its content outside the generated block differs from what rulebook last wrote.

## Impact
- Affected specs: none
- Affected code: src/core/merger.ts, src/cli/commands/update.ts
- Breaking change: NO
- User benefit: none
