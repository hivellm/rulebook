#!/usr/bin/env node
// `rulebook-hook <event>` — the Claude Code hook entry (v7.5). Kept out of the
// full CLI so a hook loads only what it runs; see hook-entry.ts.
import { runHookMain } from './hook-entry.js';

process.exitCode = await runHookMain(process.argv.slice(2));
