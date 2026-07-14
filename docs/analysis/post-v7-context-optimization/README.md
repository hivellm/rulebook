# Post-v7.0.0 Context Optimization — Is There Anything Left to Trim?

**Date**: 2026-07-14
**Scope**: Follow-up audit after the v7.0.0 release (MCP 26→5, hooks 7→1,
files 95→29, static context −78% vs v6) asking one question: can Rulebook's
remaining footprint still interfere with Fable-class model performance?
**Branch**: `release/v7.0.0` (measured at `bd61e45`)
**Continues**: [v7-performance](../v7-performance/README.md)

## Executive summary

v7.0.0 already delivered the big wins. The answer to "is there still room?" is:
**yes, but the remaining gains are small — redundancy cleanup and honest
measurement, not architecture.** The v7 redesign was sound.

**STATUS: IMPLEMENTED (phases A–D, 2026-07-14).** Final measurement with the
honest benchmark:

| Metric | v7 target | Before | **After (shipped)** | Status |
|---|---:|---:|---:|---|
| Always-on tokens/session | ≤2,500 | 3,352 (miscounted) | **1,678** | ✅ **PASS** |
| On-demand (reported, not budgeted) | — | — | 3,383 | ℹ️ |
| MCP tools | ≤8 | 5 | 5 | ✅ pass |
| MCP schema bytes | ≤3,600 | 3,592 | 3,562 | ✅ pass |
| MCP init ms | ≤250 Win / ≤150 Linux | 210 (Win) | 208 (Win) | ✅ pass |
| Hot-path hooks | ≤1 | 1 | 1 | ✅ pass |
| Installed files | ≤20 | 29 | **17** | ✅ **PASS** |

**ALL v7 BUDGETS PASS.** Phase B verification (2.1): the current Claude Code
harness does **not** auto-load AGENTS.md when CLAUDE.md exists (confirmed
empirically — session boot context contains CLAUDE.md + AGENTS.override.md
only), so AGENTS.md is classified as other-tools/on-demand and kept
self-sufficient for Cursor/Codex/Gemini rather than thinned to a pointer.

Static breakdown (tokens): CLAUDE.md 545 · AGENTS.md 634 · AGENTS.override 42 ·
STATE+PLANS 167 · rules 544 · skills+commands 522 · MCP schemas 898.

**Headline conclusion:** two of the three failing budgets are largely
**benchmark artifacts** — the script counts on-demand, path-scoped, and
possibly non-auto-loaded files as always-on ([03](03-measurement-methodology.md)).
The one genuine redundancy — **12 slash commands that duplicate the 5 MCP
tools** — is what pushes both the file count and a big slice of the token
count over ([02](02-remaining-redundancies.md)). Fix the measurement + prune
the commands and every budget passes honestly, with no loss of capability.

The genuinely always-on core for a Claude Code session is already ≈2,007
tokens (CLAUDE.md 545 + override 42 + skills/commands 522 + MCP 898) —
**under the 2,500 budget today**. Rulebook is no longer a meaningful drag on
Fable; what remains is hygiene.

## Files

| File | Theme |
|---|---|
| [01-current-state.md](01-current-state.md) | Measured budgets and where they stand |
| [02-remaining-redundancies.md](02-remaining-redundancies.md) | The real optimization surface (commands, root-file duplication) |
| [03-measurement-methodology.md](03-measurement-methodology.md) | Why "FAIL" overstates the problem |
| [04-execution-plan.md](04-execution-plan.md) | Phased plan A–D + explicitly-not-worth-doing list |
