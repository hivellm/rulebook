# 06 — Model panel

The measured findings (00–05, as a self-contained prompt) went to five reviewers on 2026-10-14 with the
same six questions: ranked root causes, critique of the candidate changes, missing changes, what is not
rulebook's fault, top five changes, open questions. Full answers are kept in the session scratchpad
(`panel/answer-*.md`); this file summarizes them.

| Reviewer | Route | Result |
|---|---|---|
| Codex (gpt-6-astra) | `codex exec --sandbox read-only` in this repo, via 9router | answered (its local file reads failed at startup, so it reviewed the supplied numbers only) |
| gpt-6.1-sol | 9router `/chat/completions` | answered |
| Claude Opus 5.5 | native subagent, read the repo and re-measured | answered |
| grok-4.6 | 9router | failed: upstream 502 "fetch connect timeout" (3 retries) |
| kimi-k3 | 9router | failed: upstream 502 "fetch connect timeout" (3 retries) |

Measurements and the draft were produced by Claude Opus 5.5 and Claude Fable 5.1 workers; this synthesis
was written by Claude Opus 5.5.

## What each model said

### Codex (gpt-6-astra)

- **Ranking:** 1 mandatory delegation (F-022 strongest evidence), 2 model/service latency multiplying the
  extra calls, 3 per-tool process spawning, 4 cold starts + legacy rules, 5 prompt gate, 6 invisible
  background work, 7 `npx @latest` (hygiene, weak explanation for slowness).
- **Critique:** keep thresholds but treat edit counts and the 150–200 k context line as provisional;
  `git diff --stat` cannot replace a real diff review; push-only validation finds defects late; guard
  replacement needs parity tests; hand-backs need changed paths, validation and risks, not just a status
  line. Corrects the cleanup gain to 3,762 tokens (Synap) and 2,611 (ar-v3-dashboard).
- **Missing:** dedicated hook executable; one resolved runtime shared by hook and MCP; a circuit breaker
  after repeated gate failures; `doctor --performance --json`; separate critical-path time from summed
  time; bound concurrent heavy work; a paired replay benchmark before release.
- **Warning:** summed hook durations are elapsed time, not CPU time; do not add the gains together.

### gpt-6.1-sol

- **Ranking:** 1 delegation + hand-back ceremony, 2 model latency and cold agents amplified by
  concurrency, 3 per-tool spawning, 4 invisible background execution, 5 prompt gate, 6 legacy rules,
  7 MCP launch wrappers.
- **Critique:** same direction as Codex. Report + `--stat` is not correctness review; warm-agent reuse
  needs stale-context controls; MCP schema byte-shaving is low value; avoid a brittle 250 ms budget
  from one host sample.
- **Missing:** a lightweight `dist/hooks/prompt-gate.js` entry resolved at install time; a managed pinned
  runtime launched with `node` + absolute path; hook health and ownership diagnostics; per-session agent
  concurrency limits (benchmark 1/2/4 first); structured durations for every stage; generate the
  orchestration text from one config object and test that no two generated instructions contradict;
  enforce the gate deadline over the whole process tree.
- **Decision boundary:** "remove universal workflow mandates now; benchmark threshold values and
  concurrency limits before making them new mandates."

### Claude Opus 5.5

Read the sources and re-measured. Two corrections and several verified additions:

- **Correction to F-001:** the guards' 331–416 ms subagent average is the slow path triggered by ordinary
  text (" at " in a Bash description: 134–165 ms → 309–371 ms), not spawn contention. Folded into F-001/F-002.
- **New:** both guards answer `"permissionDecision":"allow"` on every passing call (F-039 below).
- **Ranking:** 1 delegation mandate + close-out steps, 2 Codex model and gateway latency (not rulebook),
  3 the per-call hook stack on a loaded Windows box (mostly not rulebook; UzEngine's own 1.78 s git hook
  dominates there), 4 rulebook guards on the slow path, 5 Jev prompt hook, 6 large orchestrator
  contexts, 7 cold subagents, 8 leftover v6 rules ("NEVER batch-read" likely adds calls), 9 `npx @latest`.
- **Critique:** thresholds must be visible before work starts (files already in context, ≤ ~3 files),
  not "≤ 3–5 edits"; validate with a replay A/B of ~20 historic small fixes; delegation never wins on wall
  time even at 11–30 edits, so the spec should say delegation is for context protection and parallelism.
  Moving guards to `permissions.deny` is the riskiest item because it removes the implicit auto-approve.
  Lowering the gate timeout alone does nothing for the normal path.
- **Missing:** lightweight `rulebook-hook` bin; prefilter fix as a patch now; decide the implicit `allow`
  openly; pinned MCP launch; stdin-close exit; `doctor --perf`; git-safety as `permissions.ask` rules (would
  let UzEngine drop its 1.78 s hook); ask Jev fewer questions (drop skill/agent/model/parallel); derive the
  project dir from `$0` for Codex; one progress line per dispatch and hand-back.

## Consensus

| Claim | Codex | gpt-6.1-sol | Opus |
|---|---|---|---|
| Delegation mandate is the largest rulebook-controlled cause | agrees | agrees | agrees |
| Default to judgment, keep an explicit orchestrator mode | agrees | agrees | agrees |
| Thresholds are provisional; validate with a replay benchmark before release | agrees | agrees | agrees |
| `git diff --stat` is not a review | agrees | agrees | agrees |
| Prompt gate opt-in, skip machine inputs, no "ask" on undecided, drop "Gate first" | agrees | agrees | agrees |
| Lightweight hook entry point | agrees | agrees | agrees |
| Guards should stop spawning, but only with parity tests | agrees | agrees | agrees (riskiest: implicit allow) |
| Safe, hash-based `update` cleanup with backups | agrees | agrees | agrees |
| Pinned / direct MCP launch; exit on stdin close; no shared daemon | agrees | agrees | agrees |
| `doctor --perf` report; report, never edit, user/project hooks | agrees | agrees | agrees |
| Summed hook durations are not CPU time nor session wall time | agrees | agrees | agrees |
| `npx @latest` is a hygiene issue more than a slowness cause | agrees | silent (ranks it last) | agrees |

## Disagreements and how they were resolved

- **Review after delegation.** The draft proposed "report + `git diff --stat`"; all three rejected it.
  Resolved: the main session reads the report; the full diff is reviewed once per PR (the existing
  `review-fanout` workflow), not per task.
- **When to run the full quality gate.** The draft said "once at push". Codex and gpt-6.1-sol want targeted
  checks immediately. Resolved: subagents run the tests that cover their change; the full gate runs before
  commit of a batch and before push, as CLAUDE.md already says.
- **Hand-back size.** The draft said "status line + path"; Codex and gpt-6.1-sol want changed files,
  validation results and risks. Resolved: a short structured report (outcome, files, checks run, open
  risks), no prose dump.
- **Concurrency limits.** gpt-6.1-sol and Codex propose agent concurrency limits; no measurement supports a
  number. Resolved: not in 7.5.0; measure 1/2/4 concurrent agents in the replay benchmark first.
- **Guards to `permissions.deny`.** Opus showed the guards auto-approve every call, so removing them can
  bring back permission prompts. Resolved: operator decision Q3 in [07](07-recommendations.md).

## Findings raised by the panel and verified in the code

### F-039 — Both guards silently auto-approve every Bash, Edit and Write call

- **Evidence:** `allow()` in `templates/hooks/no-os-scheduling.sh:16` and
  `templates/hooks/protect-task-scaffolding.sh:12` prints `"permissionDecision":"allow"`; a PreToolUse
  `allow` skips Claude Code's permission prompt. The opt-in tool gate deliberately never answers `allow`.
- **Impact:** every rulebook 7.x project grants Bash/Edit/Write without prompts, a security-relevant default
  nobody chose explicitly; replacing the guards with deny rules would bring prompts back.
- **Confidence:** high. **Rulebook-attributable:** yes.

### F-040 — "Ask the operator" is a rendering rule, not Jev's judgment

- **Evidence:** `src/core/typesafe/gate.ts:584`: the line is emitted when `needsOperatorDecision === true`
  **or `kind === null` or `kind === 'unclear'`**. Kind was undecided on 22 of 50 calls and unclear on 8.
- **Impact:** explains the 64 % "ask" rate (F-011); the fix is one condition.
- **Confidence:** high. **Rulebook-attributable:** yes.

### F-041 — The `implementer` agent in this TypeScript repo says it writes Rust

- **Evidence:** `.claude/agents/implementer.md`: "Writes production-quality rust code". The language
  substitution picked the wrong language, and `update` never refreshes agents.
- **Impact:** a likely reason the model picks general-purpose (38.2 k first call) over the whitelisted
  implementer (19.5 k) — 323 of 432 v7.4 spawns (F-025).
- **Confidence:** high (the text); medium (the effect on agent choice). **Rulebook-attributable:** yes.

### F-042 — `update` only manages four hook events, so retired entries survive

- **Evidence:** `src/core/claude/claude-settings-manager.ts:168`:
  `MANAGED_EVENTS = ['PreToolUse', 'SessionStart', 'Stop', 'UserPromptSubmit']`. Entries on PostToolUse,
  PreCompact, SubagentStop or SessionEnd, entries in `settings.local.json`, and entries whose script file is
  gone are never removed.
- **Impact:** consistent with UzEngine's 269 non-blocking errors per session from retired v6 hooks (F-006).
- **Confidence:** high (code); medium (that this is UzEngine's exact path). **Rulebook-attributable:** yes.
