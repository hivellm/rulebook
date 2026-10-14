<!-- ORCHESTRATION:START -->
# Orchestration & Model Routing

Mode: `judgment` (the default). The main session does small, local work itself
and delegates when delegation pays. Set `"orchestration": "orchestrator"` in
`.rulebook/rulebook.json` and run `rulebook update` for the opt-in orchestrator
mode, where every task goes to a subagent.

## 1. Main-session role

- Do the work yourself when it is small and local: the files are already in
  context and about 3 or fewer will change. A one-line fix done directly takes
  ~4–5 model turns; delegated, ~10–12.
- Delegate when it pays:
  - 2+ independent parts with disjoint files — run them in parallel;
  - broad exploration whose raw output you don't need (wide searches, many-file
    reads);
  - long work (roughly 10+ edits or 50+ tool calls);
  - a main context past ~150k tokens.
- Why: delegation protects the main context and runs independent work in
  parallel; it does not make work faster. A spawn starts cold — ~20–40k tokens of
  fresh context — and re-reads files you already read. When none of the cases
  above applies, the round trip costs more than it saves.
- These thresholds are starting points, not rules; when a case is unclear, pick
  the cheaper path.
- Plan multi-part work before executing it: split it, note which parts depend on
  each other, and pick a model for each part.

## 2. Model routing

Specify the model in every agent call. Never rely on the default.

| Model | Use for |
|-------|---------|
| **Fable 5.1** | Architecture, complex bugs, code review |
| **Opus 5.5** | Edits, tests, documentation, refactoring |
| **Haiku 4.5** | Research, summaries |

Never use Fable for simple work — simple tasks go to Opus 5.5. In Claude Code,
set the Agent tool's `model` to `fable`, `opus`, or `haiku`.

## 3. Jev gate (opt-in, on demand)

Nothing here runs by default. `rulebook_gate {prompt, notes?}` is an on-demand
MCP tool: call it when you want Jev's (TypeSafe's System One model) routing for
an operator prompt — send the prompt verbatim. An opt-in `UserPromptSubmit` hook
(off by default; `gate.promptHook.enabled: true` in `rulebook.json`, then
`rulebook update`) runs `node <rulebook>/dist/cli/hook-main.js prompt-gate` in
exec form (no shell) on each operator prompt. It skips machine inputs (agent and
task notifications, agent messages, local command output), asks Jev only
`kind`, `needs_task`, `existing_task`, `needs_operator_decision`,
`in_project_scope` and the risks, and injects the result under "Jev routing
(rulebook prompt hook)": act on that routing and do not call the gate again. It
tells you to ask the operator only when `needsOperatorDecision` is true. Either
way, rulebook sends Jev a short project description (config; a one-line summary
from `gate.scope.description`, else `package.json`, else the README's first
prose paragraph; tasks, open questions; for the tool, also installed skills,
subagent types and the routing table in section 2) plus the prompt, and asks one
question per decision the main session would otherwise guess:

| Decision | Question | Routing field |
|----------|----------|---------------|
| `kind` | Small fix, task work, question or analysis, answer to an open question, setup or config, or unclear? | `kind` |
| `needs_task` | Should it be tracked as a rulebook task? | `needsTask` |
| `existing_task` | Which listed task does it continue? (omitted when there are no tasks) | `existingTaskId` |
| `model` | Fable, Opus, or Haiku, per section 2? | `model` |
| `agent` | Which subagent type does the main work? | `agentType` |
| `skill` | Which installed skill applies? (omitted when none are installed) | `skill` |
| `parallel` | Does it split into independent parts with disjoint files? | `parallel` |
| `needs_operator_decision` | Does it leave an outcome-changing choice only the operator can make? | `needsOperatorDecision` |
| `in_project_scope` | Is it about this project? (omitted when nothing describes the project) | `inProjectScope` |
| `risk_destructive_git` | Does it imply a destructive git operation? | `risk.destructiveGit` |
| `risk_os_scheduling` | Does it imply OS-level scheduling? | `risk.osScheduling` |
| `risk_secrets` | Does it involve API keys, tokens, passwords, or `.env` files? | `risk.secrets` |

Thresholds: a choice is decided at confidence ≥ 0.6. A yes/no answer is true at
≥ 0.7, false at ≤ 0.3, and undecided in between. A risk flag is true at ≥ 0.5
and is never undecided — a maybe-risk is a risk. Follow-on rules: a small fix
needs no task; an answer to an open question with an undecided existing task
goes to the task that owns the first open question; a decided existing task
means a task; an undecided `model` with a decided `agent` is derived from
section 2.

Act on `routing`:
- `kind` — small-fix: no task; handle it per section 1. task-work: create or
  reuse a task (`existingTaskId`). question-or-analysis: answer or report; no
  edits. answer-to-open-question: `rulebook_task {action:"answer"}`.
  setup-or-config: per section 1 (implementer or build-engineer when delegated).
- `needsTask`, `existingTaskId` — create a task only when `needsTask` is true
  and there is no existing id; otherwise reuse the existing task.
- `model`, `agentType`, `skill` — when you delegate, pass them into the
  subagent brief and the Agent call; the subagent loads the skill.
- `parallel` — true: the work splits into independent parts with disjoint
  files; run them as parallel subagents.
- `needsOperatorDecision` — true: ask before acting (`rulebook_task
  {action:"ask"}` when a task exists; otherwise one direct question). This is
  the only routing field that asks the operator.
- `inProjectScope` — false: the prompt looks off-topic for this project;
  confirm with the operator before acting.
- `risk.destructiveGit` / `risk.osScheduling` / `risk.secrets` — true: the
  Tier 1 prohibitions (destructive git, OS-level scheduling) and the rule never
  to read, print, or log secrets apply. Refuse the step, or get explicit
  authorization before it.

Undecided fields (listed in `undecided`) fall back to sections 1, 2 and 4 of
this spec: decide them yourself — an undecided or `unclear` `kind` is not a
reason to ask. `available:false` means Jev could not be reached, has no key, or
is disabled: proceed under this spec and, once, show the operator the
`instructions` for `TYPESAFE_API_KEY`. The gate is advisory — it never blocks.
Call it at most once per operator prompt, from the main session only:
subagents do not call the gate; they receive `routing` in their brief. Disable
it with `RULEBOOK_GATE=off`.

When the prompt hook is on, it always blocks one case: Jev puts
`risk_os_scheduling` at or above `gate.promptHook.blockThreshold` (default 0.9)
— OS-level scheduling is never allowed — and the prompt stops with a reason. An
off-topic prompt (`in_project_scope` at or below `gate.scope.offTopicBelow`,
default 0.15) follows `gate.scope.onOffTopic`: `ask` (default) opens the
context with a line to confirm with the operator before acting, `block` stops
the prompt; above that and up to 0.3 it is only a warning line. Destructive git
and secrets never block there (the operator's own prompt is the authorization);
they, and any risk from 0.5 up that does not block, arrive as warning lines in
the context. The hook is fail-open: no key, gate disabled, timeout
(`gate.promptHook.deadlineMs`), or an error → no output, and the prompt goes
through unchanged. A missing or broken hook entry is not silent: it prints one
`systemMessage` per session saying the gate is off and how to fix it. Turn the
hook on with `gate.promptHook.enabled: true` and `rulebook update`;
`--no-typesafe` turns TypeSafe off entirely.

An opt-in tool-call gate (`gate.toolHook.enabled: true`) is a `PreToolUse`
hook (`jev-gate.sh tool` → `rulebook hook tool-gate`) on `Bash|Edit|Write`
that checks what agents do, not what the operator asked. Cheap checks come
first: the OS-scheduling guard's deny, then destructive git (`ask`, citing
Git safety) with no Jev call. Otherwise Jev gets one redacted summary of the
call (no `.env` content) and answers `safe_reversible`, `no_secret_exposure`,
`follows_project_rules` and, with an active task, `in_task_scope`: below 0.5
the call is denied, below 0.7 the operator is asked (scope only ever asks).
Answers are cached for 15 minutes; the deadline is 2000 ms; any failure lets
the call through. It never answers `allow`. A denied call gets a reason:
take a safer route or ask the operator; never work around the gate.

When `features.logging` is on, each gate decision is appended as one JSON line
to `.rulebook/logs/gate.jsonl` (prompt hash, routing, usage, elapsed time) — no
prompt text, no key.

## 4. Delegation

When you delegate:

- One subagent per independent part. Run independent subagents in parallel;
  run dependent ones in order.
- Brief completely: the rulebook task id (if any), the goal, the files or areas
  involved, decisions already made, the constraints, and the report format. A
  complete brief saves the subagent from re-reading what you already know.
- Prefer a narrow installed agent (implementer, researcher, tester, …) over
  general-purpose: its fixed context is about half (~20k vs ~38k tokens).
- Ask for a short structured report: outcome, files changed, checks run, open
  risks. No prose dump.
- Read the report rather than re-reading the files it covers. If it is unclear,
  ask the agent (`SendMessage`) before re-doing its work.
- Progress: one line to the operator after each dispatch (what went out, to
  which agent and model) and after each hand-back (the outcome). Background
  work is otherwise invisible.

## 5. Subagent contract

When the work has a rulebook task (multi-session or multi-phase work), the
subagent owns that ONE task and drives it through the full cycle:

1. Fill or update the task's `proposal.md`, `tasks.md`, and `specs/`.
2. Set the task in progress; check each `tasks.md` item as it is completed.
3. Run type-check → lint → the tests covering the change as it works; run the
   full quality gate (type-check → lint → tests, full suite) before archiving.
   All green.
4. Archive the task via `rulebook_task {action:"archive"}` when everything is
   checked and the gate is green.
5. Report back: outcome, files changed, checks run, open risks (anything left
   undone, with the concrete reason).

A small fix has no rulebook task: the subagent works from the brief, runs the
tests covering its change, and reports back — no proposal, tasks, specs, or
archive.

## 6. Monitoring

- Track each running agent and read each report as it arrives.
- Pause or restart an agent that stalls, loops, stops for any reason, or drifts
  from its task. In Claude Code: `TaskStop` to stop it, `SendMessage` to correct
  it, or re-spawn it with a corrected brief.
- Finish a small leftover yourself when it meets section 1; re-dispatch anything
  larger with a corrected brief.

## 7. Close-out

Close-out follows the release, not each task:

- **CHANGELOG** — per PR or release, for user-visible changes. Not per task.
- **Diff review** — once per PR, over the full diff (the `review-fanout`
  workflow when installed). Not per task; per task, the report is the record.
- **Task archive** — only for tracked multi-session tasks (section 5). Small
  fixes have none.
- **Tests** — subagents run the tests covering their change; the full quality
  gate (type-check → lint → full suite) runs before a commit batch and before
  push.
- **Commits** — commit a batch of related work once the full gate is green.
<!-- ORCHESTRATION:END -->