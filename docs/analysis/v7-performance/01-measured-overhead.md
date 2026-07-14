# 01 — Measured Overhead

All numbers measured on this machine (Windows 10, warm caches) against this
repository and against a fresh `rulebook init --yes --tools claude-code`
TypeScript project.

## F-001 — ~15k tokens of static context injected into every session

**Evidence**: tiktoken (gpt-4 encoder) over the files Claude Code auto-loads at
session start in a default-init project.

| Source | Default `init --yes` (TS project) | This repo (dogfood) |
|---|---:|---:|
| CLAUDE.md | 1,633 tok | 1,600 tok |
| AGENTS.md | 3,010 tok | 3,010 tok |
| AGENTS.override.md | 42 tok | 548 tok |
| STATE.md + PLANS.md | 167 tok | 271 tok |
| `.claude/rules/*.md` (18–19 files) | 5,838 tok | 5,960 tok |
| Agent definitions (11–12) | 435 tok | 2,087 tok |
| Skill/command descriptions (33–35) | 311 tok | 852 tok |
| MCP `tools/list` (26 tools, 13,965 bytes) | ~3,491 tok | ~3,491 tok |
| **Total per session** | **~14,927 tok** | **~17,819 tok** |

Additional on-demand weight: `.rulebook/specs/` ≈ **29,942 tokens** (AGENTS.md
instructs the model to read `RULEBOOK.md` before creating any task).

**Impact**: ~15k tokens is 7–8% of a 200k window consumed before the user types a
word. Prompt caching absorbs most of the *dollar* cost but none of the *attention*
cost: 19 rule files restating the same discipline 2–3× dilutes
instruction-following on the rules that actually matter.
**Confidence**: high (direct measurement).

## F-002 — 7 hook entries across 5 events, all spawning bash

**Evidence**: [claude-settings-manager.ts](../../../src/core/claude/claude-settings-manager.ts)
full desire set; spawn latency measured via 5-run averages.

| Event | Hook | Fires | Measured cost |
|---|---|---|---:|
| UserPromptSubmit | terse-mode-tracker.sh | **every user prompt** | ~36 ms (warm) |
| Stop | check-context-and-handoff.sh | **every model turn** | ~36 ms + jq |
| PreToolUse `Edit\|Write` | enforce-pre-tool.sh | every edit | ~36 ms; +node (~77 ms) on trigger tokens |
| PreToolUse `Agent` | enforce-team-for-background-agents.sh | every Agent call | ~36 ms |
| SessionStart ×4 | resume-from-handoff, on-compact-reinject, update-check, terse-activate | session start | 4 spawns; update-check may hit npm |

Warm-cache spawn latency is modest (36–77 ms), but on cold cache /
antivirus-scanned machines Git Bash spawn is commonly **150–400 ms**. Worse than
latency is the false-positive tax (see F-009): a denied tool call costs a *full
model turn* to recover — seconds of inference, not milliseconds.
**Impact**: medium (latency), high when combined with denials.
**Confidence**: high (direct measurement).

## F-003 — MCP server loads the entire CLI to serve 26 verbose tools

**Evidence**: `.mcp.json` launches `node ./dist/index.js mcp-server` — the full
CLI bundle (commander, inquirer, blessed, ora, chokidar, chalk…) loads to serve
MCP. Measured init: **~370 ms**. The slim `dist/mcp/rulebook-server.js` binary
exists (`rulebook-mcp` bin in package.json) but is not what `.mcp.json` uses.

**26 tools** with verbose schemas = 13,965 bytes ≈ **3,500 tokens** injected into
every session, for tools that are mostly file-CRUD wrappers used a few times per
task.
**Impact**: medium (startup) + high (schema tokens, see F-001).
**Confidence**: high (direct measurement).

## F-004 — Default install footprint: 91 files, ~300 KB

**Evidence**: `rulebook init --yes` on a minimal TypeScript project creates
**91 files** under `.claude/` (149 KB) + `.rulebook/` (137 KB), plus CLAUDE.md,
AGENTS.md, AGENTS.override.md. Includes 11 agent definitions, 33 skills/commands,
6 workflows, 18 rule files — most duplicating native harness capabilities (see
F-010).
**Impact**: medium — repo noise, upgrade churn, and every file is a candidate for
context injection.
**Confidence**: high (direct measurement).
