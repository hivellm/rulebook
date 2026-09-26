---
name: env-windows-probing
description: Windows-specific facts for running review probes in this repo — broken global `rulebook` shim on PATH, tsx scratch-file constraints, measured CLI startup
metadata:
  type: project
---

The global npm `rulebook` shim on this machine (C:\Users\Bolado\AppData\Roaming\npm\rulebook) points at a missing `@hivehub/rulebook/dist/index.js` and crashes with MODULE_NOT_FOUND (exit 1). There is no `node_modules/.bin/rulebook` in the repo either.

**Why:** Discovered 2026-09-26 while probing `templates/hooks/jev-gate.sh`; any PATH-based probe of the CLI hits this stale shim and looks like a code bug when it is the environment. Use `node dist/index.js <cmd>` or `npx tsx` against `src/`.

**How to apply:** When testing hook wrappers or anything that shells out to `rulebook`, prepend a fake or the real `dist/index.js` on PATH; do not trust `command -v rulebook` results. Measured startup for `node dist/index.js hook tool-gate` (disabled path) is ~190 ms.

Scratch probes with `npx tsx` from the scratchpad: write them as `.ts` with an async IIFE (top-level await fails — tsx transforms scratch files to CJS), and import repo modules with `E:/HiveLLM/Rulebook/src/...` paths (works under CJS; `.mts` + absolute Windows paths fails with ERR_UNSUPPORTED_ESM_URL_SCHEME).
