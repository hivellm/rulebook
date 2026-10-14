# Proposal: phase5_init-override-template-path

## Why
initOverride builds the template path from new URL(import.meta.url).pathname, which resolves under src/core and breaks on Windows drive paths, so it always writes the fallback text instead of templates/core/agents-override.md.

## What Changes
Resolve the template with fileURLToPath and the package templates root used elsewhere; add a test that init writes the real template on Windows-style paths.

## Impact
- Affected specs: none
- Affected code: src/core/state/override-manager.ts
- Breaking change: NO
- User benefit: none
