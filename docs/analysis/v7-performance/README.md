# v7.0.0 Performance Analysis — Why Rulebook Slows Sessions Down, and How to Fix It

**Date**: 2026-07-14
**Scope**: Full-stack overhead audit of Rulebook v6.0.0 as experienced by a modern
frontier model (Claude Fable 5 / Opus 4.x) inside Claude Code.
**Verdict**: Rulebook's cost is real and measurable, but the dominant cost is **not**
hook latency or MCP startup — it is **prompt weight + process ceremony + rule
contradictions** that force the model to spend turns and attention on Rulebook
itself instead of the user's task. v7.0.0 must invert the design philosophy:
from *babysitting the model* to *assisting the model*.

All numbers below were measured on this machine (Windows 10, warm caches) against
this repository and against a fresh `rulebook init --yes` TypeScript project.

---

## 1. Measured overhead

### 1.1 Static context injected into EVERY session

Every Claude Code session in a Rulebook project starts by loading CLAUDE.md and all
its imports, every `.claude/rules/*.md`, all agent/skill/command descriptions, and
the MCP `tools/list` schemas — before the user has typed a single word.

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

**Impact**: ~15k tokens is 7–8% of a 200k window consumed before work starts.
Prompt caching absorbs most of the *dollar* cost but none of the *attention* cost:
19 rule files restating the same discipline 2–3× dilutes instruction-following on
the rules that actually matter, and measurably degrades adherence when rules
contradict each other (see §2.3).

### 1.2 Hooks (runtime latency)

Full-featured install wires **7 hook entries across 5 events**, all spawning
`bash` (Git Bash on Windows):

| Event | Hook | Fires | Measured cost |
|---|---|---|---:|
| UserPromptSubmit | terse-mode-tracker.sh | **every user prompt** | ~36 ms (warm) |
| Stop | check-context-and-handoff.sh | **every model turn** | ~36 ms + jq |
| PreToolUse `Edit\|Write` | enforce-pre-tool.sh | every edit | ~36 ms; +node (~77 ms) when payload contains a trigger token |
| PreToolUse `Agent` | enforce-team-for-background-agents.sh | every Agent call | ~36 ms |
| SessionStart | resume-from-handoff, on-compact-reinject, update-check, terse-activate | session start | 4 spawns, update-check may hit npm |

Warm-cache spawn latency is modest (36–77 ms), but on cold cache / antivirus-scanned
machines Git Bash spawn is commonly **150–400 ms**. Worse than the latency is the
**false-positive tax** (§2.4): a denied tool call costs a *full model turn* to
recover — several seconds of inference, not milliseconds.

### 1.3 MCP server

- `.mcp.json` launches `node ./dist/index.js mcp-server` — the **entire CLI bundle**
  (commander, inquirer, blessed, ora, chokidar, chalk…) is loaded to serve MCP.
  Measured init: **~370 ms**. The slim `dist/mcp/rulebook-server.js` binary exists
  (`rulebook-mcp`) but is not what `.mcp.json` uses.
- **26 tools** with verbose schemas = 13,965 bytes ≈ **3,500 tokens** in every
  session, for tools that are mostly file-CRUD wrappers used a few times per task.

### 1.4 Installed footprint

Default `init --yes` on a minimal TypeScript project: **91 files, ~300 KB** under
`.claude/` + `.rulebook/`, plus CLAUDE.md, AGENTS.md, AGENTS.override.md.

---

## 2. The dominant cost: how v6 fights modern models

The per-call numbers above are secondary. The primary slowdown is **behavioral**:
v6's rules were designed circa weaker models that needed guardrails against losing
context, hallucinating APIs, and wandering off-task. Frontier models (Fable 5,
Opus 4.x) ship with native planning, native parallel tool use, native context
compaction, native verbosity control, and native subagent orchestration. v6's
guardrails now *conflict* with those capabilities.

### 2.1 Process ceremony: 10–14 extra model turns per task

For a task as small as a one-line fix, the rules mandate:

```
session_start → read PLANS.md → knowledge_list → learn_list → decision_list
→ read specs/RULEBOOK.md (~30k tok) → task_create → implement
→ task_update (×N) → mark [x] (×N) → knowledge_add → learn_capture
→ task_archive → session_end
```

Each MCP call is a **full model turn**: tool call + result + reasoning ≈ seconds of
inference and hundreds-to-thousands of tokens. The ceremony around a 5-minute fix
can exceed the fix itself by 2–4×. *This — not hook latency — is what the user
feels as "Rulebook is slow".*

### 2.2 Forced delegation multiplies wall-clock time

"**Never implement directly in the main conversation when an agent fits**" forces a
subagent round-trip for work the main model could do immediately with context it
*already has*. Every delegation = spawn + the subagent re-reading the same files +
report-back + reconciliation. For small/medium tasks this is a **2–5× wall-clock
multiplier** and a token duplicator. Delegation pays off only for genuinely
parallel or context-exceeding work — which the harness already suggests natively.

Compounding it:
- **Sequential-editing + 1–2-file decomposition** rules forbid the multi-file
  batches modern models execute reliably, and directly contradict the harness's
  own "run independent tool calls in parallel" guidance.
- **Teams enforcement hook** denies background agents without `team_name`,
  producing deny→retry loops in a harness that now has native teammate messaging.

### 2.3 Redundant and contradictory rules

The same discipline is stated 2–3 times each (CLAUDE.md + AGENTS.md +
`.claude/rules/*` + override): Karpathy guidelines ×2, full-task-no-questions ×3,
delegation ×3, task workflow ×3, session continuity ×3. And several rules
contradict each other outright:

| Rule A | Rule B (contradicts) |
|---|---|
| "Execute the full task in one turn, never stop" | task-decomposition: "STOP — report back with the decomposition" |
| "Delegate by default, never implement in main thread" | "Surgical changes, minimum code, touch only what you must" (subagents routinely over-touch) |
| "Parallelize independent work aggressively" | "Sequential file editing, never batch" |
| "No questions mid-task" | "If something is unclear, stop and ask" |
| "Simplicity first, no abstractions" | Mandatory skills/agents/teams scaffolding for repeated work |

A model burning reasoning tokens reconciling its own rulebook is pure waste, and
contradictions measurably reduce compliance with the rules that matter (git
safety, no secrets, quality gates).

### 2.4 Structural enforcement with false positives

`enforce-pre-tool.sh` denies any source write whose content matches
`/\bplaceholder\b|\bstub\b/i` or `TODO|FIXME|HACK` in comments. Legitimate code
tripping it constantly:

- `<input placeholder="Search…">` — standard HTML/JSX attribute
- Test doubles literally named *stub* (`sinon.stub()`, `createStub…`)
- Code that *processes* TODO markers (linters, this hook itself)
- `skip` in tasks.md ("skip-navigation link", "skipList")

Every false deny costs a full recovery turn and teaches the model to **rewrite
correct code to dodge a regex** — the worst possible outcome for both speed and
quality.

### 2.5 Obsolete subsystems duplicating the harness

| v6 subsystem | Modern harness native equivalent |
|---|---|
| Handoff at 75% + Stop hook + /clear ritual | Native context summarization/compaction ("you don't need to wrap up early") |
| rulebook-terse (2 hooks + 3 skills) | Native verbosity control & output style |
| Teams enforcement hook | Native teammate/SendMessage support |
| 12 generic agents (researcher, implementer, tester…) | Native general-purpose, Explore, Plan, code-reviewer agents |
| Generic skills (debug, refactor, perf, review, security-audit…) | Native /code-review, /simplify, /verify, deep-research skills |
| Token-optimization tier tables | Model/effort selection in the harness |
| COMPACT_CONTEXT re-inject hook | Native compaction carries context forward |

The handoff system deserves emphasis: killing a session at 75% throws away a warm
cache and in-context knowledge exactly when the model is most productive, forcing
a cold restart that re-pays the full ~15k-token boot cost. Native compaction makes
the entire subsystem counterproductive.

---

## 3. v7.0.0 — Design principles

> **From babysitting to assisting.** Rulebook v7 states project *facts and values*;
> it does not script the model's *process*. Enforcement is structural only where it
> is cheap and high-precision. Everything else is trust + verification.

1. **Trust the model.** No forced delegation, no sequential-editing mandates, no
   decomposition protocols, no handoff rituals, no verbosity tiers. Frontier
   models do these natively and better.
2. **Facts over procedures.** The ideal CLAUDE.md tells the model what it *cannot
   discover* from the repo: commands, conventions, invariants, danger zones. It
   never tells the model how to think.
3. **Progressive disclosure.** One small always-loaded file; everything else
   (specs, task format, workflows) loaded on demand when actually needed.
4. **Zero hot-path hooks.** Nothing on UserPromptSubmit or Stop. At most one
   path-scoped PreToolUse guard. Never content regexes.
5. **State on disk, not in prompt.** Tasks/knowledge/decisions live in
   `.rulebook/` and are *queried*, not injected.
6. **Don't duplicate the harness.** Anything Claude Code (or Cursor/Codex) ships
   natively is deleted from Rulebook.

## 4. v7.0.0 — Concrete specification

### 4.1 Context layer (target: ≤2,500 tokens/session, −83%)

- **CLAUDE.md**: single file, ≤60 lines. Contents: project identity, build/test
  commands, git safety list, 5–8 project values (one line each), pointer to
  `rulebook` MCP for tasks. No imports of rule essays.
- **AGENTS.md**: the current `--lean` mode becomes the **only** mode — a <3 KB
  index referencing `.rulebook/specs/` for detail. Fat mode is deleted.
- **`.claude/rules/`**: 19 files → **1 file** (`rulebook.md`, ≤40 lines) holding
  only the non-derivable, non-contradictory core: git safety, no-secrets,
  quality-gate command, task-format pointer. Deleted outright: sequential-editing,
  task-decomposition, multi-agent-teams, respect-handoff-trigger, incremental-\*,
  follow-task-sequence, no-deferred, full-task-no-questions, fail-twice-escalate,
  research-first, session-workflow (their *values* survive as single lines in
  CLAUDE.md; their *procedures* are deleted).
- **Karpathy guidelines**: kept — once, as 4 lines in CLAUDE.md, not as a skill +
  two full copies.

### 4.2 Hooks layer (target: 0 spawns on hot paths)

- **Delete**: Stop (handoff), UserPromptSubmit (terse), SessionStart ×4 (handoff
  resume, compact reinject, terse activate, update check — update check moves to
  the CLI itself), PreToolUse Agent (teams).
- **Keep at most one** PreToolUse guard, matcher-scoped to `Edit|Write`, that
  checks **path only** (deny manual writes of `.rulebook/tasks/*/proposal.md` /
  `.metadata.json` when the file doesn't exist). Pure bash, no node, no content
  inspection. Content rules (no-TODO, no-stub) move to the **quality gate**
  (lint rule / pre-commit), where they belong and where the model sees them as
  compiler-style feedback instead of tool denials — and where `placeholder=` in
  JSX doesn't trip anything because real linters parse code, not regex payloads.
- All hooks that survive must ship `.ps1` equivalents and be benchmarked <10 ms.

### 4.3 MCP layer (target: ≤8 tools, ≤900 schema tokens, <150 ms startup)

- **Consolidate 26 → 8 tools**, action-parameterized:
  `rulebook_task` (create/list/show/update/archive/validate),
  `rulebook_memory` (knowledge + learnings + decisions: add/list/search/promote),
  `rulebook_session` (start/end), `rulebook_specs` (list/show),
  plus workspace variants where needed. Schemas terse: one-line descriptions.
- `.mcp.json` points at the **slim entrypoint** (`dist/mcp/rulebook-server.js`)
  with lazy imports — no CLI dependencies (inquirer/blessed/ora/chokidar) in the
  server process.
- Enforcement moves here: `rulebook_task` refuses malformed tasks at creation
  time (free — it's already a tool call), replacing the PreToolUse content regex.

### 4.4 Process layer (the big one)

- **Task ceremony becomes proportional.** Tasks are **opt-in for multi-session
  work**, not mandatory for every change. Small fixes need zero Rulebook calls.
  `rulebook_session start` returns *everything* in one call (state + plans +
  relevant knowledge digest), replacing 4–5 separate lookups.
- **Delegation is advisory.** One line: "Prefer subagents for parallel or
  context-heavy work." No enforcement, no tables, no mandatory teams.
- **Knowledge capture is opportunistic**, not mandatory-per-task: one line
  inviting capture when something non-obvious was learned.
- **Handoff/terse/teams-enforcement/token-tier subsystems: deleted.** PLANS.md
  survives as an optional scratchpad.

### 4.5 Assets layer

- **Agents**: ship **0** by default (harness natives cover all 12). `rulebook
  agents add <role>` remains for users who want them.
- **Skills**: keep only Rulebook-specific ones (task-create/apply/archive flows,
  analysis). Generic engineering skills (debug/refactor/perf/review/
  security-audit/api-design/db-design/accessibility/migrate/deploy/docs) are
  deleted — they duplicate native harness skills and pad the skills list.
- **Workflows**: keep as opt-in (`rulebook workflows add`), not default-installed.

### 4.6 Migration

`rulebook update` on a v6 project:
1. Rewrites CLAUDE.md/AGENTS.md to lean form, preserving AGENTS.override.md.
2. Removes all retired hook entries from `.claude/settings.json` via the existing
   signature mechanism (extend `LEGACY_SIGNATURES` with all v6 hooks).
3. Deletes retired rule/agent/skill files it owns; never touches user files.
4. Migrates `.mcp.json` to the slim server entrypoint.
5. Prints a diff summary; `--dry-run` supported.

## 5. Before/after budget

| Metric | v6.0.0 (default) | v7.0.0 target | Δ |
|---|---:|---:|---:|
| Static context/session | ~14,900 tok | ≤2,500 tok | **−83%** |
| MCP schema tokens | ~3,500 (26 tools) | ≤900 (8 tools) | −74% |
| Hook spawns per model turn | 2–4 | 0–1 | ~−100% hot path |
| SessionStart spawns | up to 4 | 0 | −100% |
| Model turns of ceremony per small task | 10–14 | 0–2 | **−85%+** |
| Files installed by default | 91 | ~15 | −84% |
| Rule files | 19 | 1 | −95% |
| Forced subagent round-trips | mandatory | none | wall-clock 2–5× → 1× |

## 6. Implementation phases (for rulebook tasks)

1. **Phase 1 — Context diet**: lean-only generators; collapse rules 19→1; rewrite
   CLAUDE.md/AGENTS.md templates; delete redundant/contradictory copies.
2. **Phase 2 — Hook teardown**: delete retired hooks + settings signatures cleanup;
   rewrite the surviving guard as path-only; move content rules to quality gate.
3. **Phase 3 — MCP consolidation**: 8 action-parameterized tools; slim server
   entrypoint; enforcement-at-creation; one-call `session start`.
4. **Phase 4 — Asset prune**: agents/skills/workflows become opt-in; delete
   handoff/terse/teams-enforcement/token-tier subsystems.
5. **Phase 5 — Migration + docs**: `rulebook update` v6→v7 path, `--dry-run`,
   README/CHANGELOG/migration guide, before/after benchmark in CI.

Each phase is independently shippable and measurable against §5 budgets.

---

*Measurements: tiktoken (gpt-4 encoder) over generated files; MCP timed via stdio
JSON-RPC init+tools/list; spawn latency via 5-run averages of `bash -c "exit 0"`
and bash+node. Test project: `rulebook init --yes --tools claude-code` on a
minimal TypeScript package.*
