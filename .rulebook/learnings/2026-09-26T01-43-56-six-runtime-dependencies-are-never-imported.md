# Six runtime dependencies are never imported
**Source**: manual
**Date**: 2026-09-26
**Tags**: analysis:rulebook-simplification
blessed, chokidar, node-notifier, uuid, ansi-escapes and cli-cursor have zero importers in src/ (plus @types/blessed, @types/node-notifier, @types/uuid). execa has a single trivial use (config-manager.ts:319, git config). Removing them is a no-behaviour-change chore for the next minor.