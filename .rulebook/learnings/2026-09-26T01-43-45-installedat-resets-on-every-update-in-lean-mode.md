# installedAt resets on every update in lean mode
**Source**: manual
**Date**: 2026-09-26
**Tags**: analysis:rulebook-simplification
update.ts:490-492 recovers installedAt by matching "Generated at:" in AGENTS.md. Only the full generator writes that line (generator.ts:41); lean is the default, so the match fails and installedAt falls back to new Date(). Fix: carry existingConfig.installedAt forward instead of parsing AGENTS.md.