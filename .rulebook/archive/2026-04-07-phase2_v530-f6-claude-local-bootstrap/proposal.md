# Proposal: F6 — `CLAUDE.local.md` bootstrap + `.gitignore` hygiene

Source: [docs/analysis/v5.3.0/04-features.md#f6](../../../docs/analysis/v5.3.0/04-features.md)

## Why
Anthropic's official memory model includes `CLAUDE.local.md` for per-developer overrides that should never be committed. Rulebook currently doesn't know about it, so users either don't use it or accidentally commit it.

## What Changes
- `rulebook init` writes a commented `CLAUDE.local.md` stub explaining its purpose.
- `rulebook init` ensures `.gitignore` contains `CLAUDE.local.md` and `.rulebook/backup/`.
- `rulebook update` patches `.gitignore` if either entry is missing.
- New `src/utils/gitignore.ts` (or extension of existing) for safe gitignore mutation.

## Impact
- Affected specs: none (template is the stub itself)
- Affected code: `src/cli/commands.ts`, new `src/utils/gitignore.ts`
- Breaking change: NO
- User benefit: official Anthropic mechanism for personal overrides becomes first-class
