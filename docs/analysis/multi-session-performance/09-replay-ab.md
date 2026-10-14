# 09 — Replay A/B: judgment vs orchestrator mode (decision Q5)

**Date**: 2026-10-14 · **Validates**: C1 (07), decision Q5 · **Task item**:
`phase2_orchestration-by-judgment` 1.5 · **Acceptance metric**: judgment mode p50 ≤ 20 model calls
and ≤ 7 min, with the same tests passing as orchestrator mode.

## Verdict

Judgment mode meets the metric on this sample. The margin on calls is thin.

| Criterion | Target | Judgment (measured) | Result |
|---|---|---:|---|
| p50 model calls, subagents included | ≤ 20 | 19 | met, by 1 call |
| p50 wall time | ≤ 7 min | 3.5 min | met |
| Same tests passing as orchestrator mode | equal | 6/6 fixes, every historic test (orchestrator: 6/6) | met |

- Judgment used fewer calls than orchestrator on all 6 fixes and less wall time on 5 of 6 (the sixth
  was a tie: 5.1 vs 5.0 min). It cost 46 % less in total ($5.97 vs $11.05).
- Judgment never spawned a subagent. Orchestrator spawned in every run (1–4 agents).
- 3 of the 6 judgment runs used more than 20 calls (23, 26, 26). With n = 6 and one run per cell, a
  p50 of 19 against a limit of 20 is within run-to-run noise. A larger sample is needed to call the
  call metric safe.

## Method

### Fixes and why these

Six historic fixes from `main`: commits that change 1–3 source files and add a regression test.
All come from the v7 era (August–September 2026). Older parents carry v5/v6 `CLAUDE.md` files that
import `AGENTS.md`, plus `.claude/rules/` files with their own delegation rules
(`multi-agent-teams.md`, `task-decomposition.md`); those would put extra orchestration text into both
arms. `main` has seven v7-era commits that fit; `1f50c34` was left out because it changes directive
text, not code.

| Fix | Source files changed | Problem | Covering tests (from the fix commit) | At the parent |
|---|---|---|---|---|
| `c1edd5a` | `version-bumper.ts`, `rulebook-server.ts` | `.csproj` lookup shells out to POSIX `find` (fails on Windows); MCP server reports a hard-coded version | `version-bumper.test.ts` + the `getServerVersion` check from `mcp-server.test.ts` ¹ | 7 of 16 fail |
| `18d9ce6` | `client.ts`, `tool-gate.ts` (+ `jev-gate.sh` ×2) | hook wrapper not fail-open; `redactSecrets` misses URL/flag/quoted secrets; `destructiveGitCheck` misses `+refspec`, quoted `-C/-c`, `./` | `tool-gate-hook.test.ts`, `typesafe-client.test.ts` | 15 of 118 fail |
| `2574748` | `client.ts` (+ `jev-gate.sh` ×2) | wrapper never runs the rulebook repo's own `dist`; redaction swallows `;` `&` `\|` after a flag secret | `tool-gate-hook.test.ts`, `typesafe-client.test.ts` | 4 of 124 fail |
| `1181ecd` | `tool-gate.ts`, `learn-manager.ts` | tool gate writes cache and log after its deadline; `LearnManager.list()` creates a directory | `learn-manager.test.ts`, `tool-gate-hook.test.ts` | 2 of 91 fail |
| `1e63818` | `hook.ts`, `gate.ts`, `task-manager.ts` | prompt hook logs after its deadline; `listTasks()` creates directories | `prompt-gate-hook.test.ts`, `task-manager.test.ts` | 2 of 108 fail |
| `7f6a187` | `config-manager.ts` | `.gitignore` block ignores project memory and the archive; block never self-upgrades | `gitignore-rulebook-block.test.ts`, `config-manager.test.ts` | 6 of 44 fail |

¹ `mcp-server.test.ts` is skipped on Windows, so its one `getServerVersion` test was copied into a
separate file.

Each fix was validated before the replay: at the parent, `tsc --noEmit` is clean and the covering
tests fail as shown; at the fix commit they all pass.

**Dependencies.** Five of the six parents pin `@modelcontextprotocol/sdk` 1.22.0. With the repo's
current `node_modules` (SDK 1.26.0), `tsc --noEmit` ran out of memory on those parents, which would
have broken every type-check the agents ran. Each worktree's `node_modules` is therefore a junction
to a scratch `npm ci --ignore-scripts` of the parent's own lockfile (three installs, in the OS temp
directory). For the four fixes run against both installs, the vitest results were identical.

### Prompts

Written from the commit message and the failing tests; no diff content. Sent verbatim.

<details><summary>c1edd5a</summary>

> Two bugs to fix in this repo:
>
> 1. `bumpProjectVersion()` in src/core/state/version-bumper.ts never updates a C# project's `.csproj` on Windows. It shells out to `find . -maxdepth 2 -name "*.csproj"`, and cmd.exe has no POSIX `find`, so the .csproj is silently skipped. The version bumper should not spawn any process at all. Expected: it finds a `*.csproj` in the project root or one directory below it (nothing deeper), a root-level file wins over a nested one, the pick is deterministic, and that file's `<Version>` is updated and reported as `*.csproj` in `filesUpdated`.
>
> 2. The MCP server (src/mcp/rulebook-server.ts) reports a hard-coded version "7.0.0" in its server info instead of the package's real version. Export a `getServerVersion()` function from that module that returns the `version` field of the package's package.json, and use it for the server info.
>
> Add regression tests for both.
</details>

<details><summary>18d9ce6</summary>

> Three problems in the Jev gate, found while testing the hooks:
>
> 1. The hook wrapper `templates/hooks/jev-gate.sh` (installed copy: `.claude/hooks/jev-gate.sh`) can fail every prompt and tool call. It picks `rulebook` from PATH before the project's own `node_modules/.bin/rulebook`, so a stale global shim wins, and it `exec`s the CLI, so the CLI's exit code and stderr (for example a MODULE_NOT_FOUND stack trace) become the hook's. The wrapper must be fail-open: prefer `$CLAUDE_PROJECT_DIR/node_modules/.bin/rulebook`, then PATH; always exit 0; drop the CLI's stderr; let its stdout pass through.
>
> 2. `redactSecrets()` in src/core/typesafe/client.ts misses common secrets in command lines: passwords in URLs (`git clone https://user:hunter2@github.com/x`, `psql postgres://user:pa55@host/db`), `curl -u admin:hunter2 https://x`, the values of `--password`, `--passwd`, `--secret...` (e.g. `--secret-access-key`), `--api-key`/`--apikey` and `--token` flags (with a space or `=`), and quoted assignment values containing spaces (`API_KEY = "quoted s3cret" next`, `PASSWORD='p w0rd' cmd`), where only part of the quoted value gets masked. The secret must become `***` while the rest of the text survives.
>
> 3. `destructiveGitCheck` in src/core/typesafe/tool-gate.ts lets these through: `git push origin +main` and `git push origin +HEAD:refs/heads/main` (force push through a `+` refspec), `git -C "a b" reset --hard` and `git -c 'user.name=x y' stash` (quoted global-option values), `git checkout -- ./` and `git restore ./`.
>
> Add regression tests for each.
</details>

<details><summary>2574748</summary>

> Two problems in the Jev gate:
>
> 1. In the rulebook repository itself, the hook wrapper `templates/hooks/jev-gate.sh` (installed copy: `.claude/hooks/jev-gate.sh`) never runs this repo's own build. There is no `node_modules/.bin/rulebook` here, so it falls back to whatever global `rulebook` shim is on PATH (possibly stale), or does nothing. When `$CLAUDE_PROJECT_DIR/package.json` is named `@hivehub/rulebook` and `$CLAUDE_PROJECT_DIR/dist/index.js` exists (and `node` is available), the wrapper should run `node $CLAUDE_PROJECT_DIR/dist/index.js hook <event>`. Order: the project's `node_modules/.bin/rulebook` first, then the repo's own dist (only for @hivehub/rulebook), then PATH. Another project's dist must never be run.
>
> 2. `redactSecrets()` in src/core/typesafe/client.ts swallows the shell separator that follows a flag secret: `mysql --password hunter2xyz; curl https://x` loses the `;`, and likewise the `&&` in `cli login --token=abc123xyz&& npm test` and the `|` in `tool --api-key k3yv4lue|grep ok`. The secret must still become `***`, but the `;`, `&` and `|` and the rest of the command must survive (for example `mysql --password ***;` followed by ` curl https://x`).
>
> Add regression tests for both.
</details>

<details><summary>1181ecd</summary>

> The tool-gate hook tests are flaky under load: tests in tests/tool-gate-hook.test.ts intermittently fail with ENOTEMPTY when afterEach removes the temp project's `.rulebook/cache` ("a different command or active task misses the cache"), or with a missing verdict ("safe_reversible 0.3 → deny").
>
> The problem: `runToolGate()` in src/core/typesafe/tool-gate.ts races its work against a deadline and returns "no verdict" when the timer wins, but the losing work keeps running and still writes the cache file and its log line into the project after the hook has returned. On top of that, `LearnManager.list()` in src/core/tasks/learn-manager.ts, which the gate reads, creates `.rulebook/learnings` as a side effect.
>
> Expected: work that loses to the deadline never writes into the project (no cache entry, no late log line); when the deadline expires, exactly one log line with decision "none" and error "timeout" is written on time (when logging is on); `LearnManager.list()` on a fresh project returns [] without creating any directory.
>
> Add regression tests.
</details>

<details><summary>1e63818</summary>

> The Jev prompt hook (`rulebook hook prompt-gate`, src/cli/commands/hook.ts) can write into the project after it has already returned. It races the gate run against its deadline and returns nothing when the timer wins, but the losing run keeps going and, with `features.logging` on, appends its line to `.rulebook/logs/gate.jsonl` late (for example when a fetch ignores its abort signal and answers after the deadline). Also, `TaskManager.listTasks()` in src/core/tasks/task-manager.ts, which the gate reads, creates `.rulebook/tasks` and `.rulebook/archive` as a side effect.
>
> Expected: a gate run that loses the race never writes anything into the project; when the hook's deadline expires, exactly one log line is written on time, with `source: "hook"`, `available: false`, `reason: "timeout"` (and without the prompt text or the API key); the MCP tool and CLI paths that call `runGate()` keep logging exactly as before; `listTasks()` on a fresh project returns [] and creates nothing, while a legacy archive still migrates.
>
> Add regression tests.
</details>

<details><summary>7f6a187</summary>

> The `.gitignore` block that rulebook generates (`ensureGitignore()` in src/core/state/config-manager.ts) ignores `/.rulebook/*` and only names `specs/`, `tasks/` and `rulebook.json` as exceptions, so project memory (`.rulebook/decisions/`, `.rulebook/knowledge/`, `.rulebook/learnings/`) and the task archive (`.rulebook/archive/`) are never committed. Runtime data (backup/, logs/, telemetry/, handoff/, ...) must stay ignored.
>
> Also, `ensureGitignore()` returns early when the old exceptions are already present, so existing projects would never pick up new exceptions. It should rewrite rulebook's block on every call: strip every line a past rulebook release wrote into that block (old header, `.rulebook`, `.rulebook/*`, the `!.rulebook/...` and `!/.rulebook/...` variants), keep the user's own lines, then write the current block. It must be idempotent (a second run changes nothing), must not duplicate a hand-added exception, and a project with no .gitignore gets a file that is exactly the block plus a trailing newline. The `!/.rulebook/tasks/**/*.md` line is redundant (negating the directory covers its files) and should go.
>
> Export the block from config-manager as `RULEBOOK_GITIGNORE_BLOCK` (an array of lines, starting with the header comment) and the header as `RULEBOOK_GITIGNORE_HEADER` (new header text, different from the old `# Rulebook - ignore runtime data, keep specs and tasks`). Add tests that check keep/ignore with real `git check-ignore`.
</details>

### What differs between the arms

Only the `## Orchestration` paragraph of the `CLAUDE.md` rulebook block (and the matching variant of
`.rulebook/specs/orchestration.md`, which no session opened):

- **judgment**: "Do small, local work yourself (files in context, ~3 or fewer to change). Delegate 2+
  independent parts with disjoint files (in parallel), broad exploration, long work, or past ~150k
  context — for context and parallelism, not speed; a spawn costs ~20–40k tokens. …"
- **orchestrator**: "Main session never does the work itself (own edits: CHANGELOG, commits) —
  delegate each task to one subagent (small fix: a brief, no task), model set per call: …"

Both texts come from the 7.5 generator (`generateClaudeMd` built from `2919f37`, run against each
worktree). The `CLAUDE.md` template is unchanged in the 7.5.0 release commit; the spec changed only
in its Jev-gate section.

### Controls (same in both arms)

- **Start state**: a fresh `git worktree` at the fix's parent, outside the repo tree, removed after
  scoring. `CLAUDE.md`, `.claude/settings.json` and the spec are marked skip-worktree, so
  `git status` starts clean.
- **Model and CLI**: `claude -p` (Claude Code 2.1.291), `--model claude-opus-5-5 --effort high
  --output-format json --permission-mode acceptEdits --permission-prompts none`, 20-minute timeout,
  a fresh session per cell.
- **Settings**: 7.5 defaults from a fresh `rulebook init` — no `UserPromptSubmit` hook, one
  `PreToolUse` entry gated by `if` to `.rulebook/tasks/**` edits, the OS-scheduling
  `permissions.deny` rules, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- **Permissions**: the 7.5 default allow list plus `PowerShell(*)`, passed with `--settings`
  (Claude Code ignores a project's allow rules in an untrusted workspace, and every fresh worktree is
  one). Extra deny rules on git commands that would reach the host repo's shared refs or config
  (`push`, `stash`, `tag`, `config`, `branch -D`, `worktree`, …).
- **Isolation**: user settings not loaded (`--setting-sources project,local`), so the operator's
  cortex hooks and plugins do not run; no MCP servers (`--strict-mcp-config`); auto-memory off
  (worktrees share the main repo's memory, which holds an orchestrator-only note); parent-session
  environment variables removed; `ANTHROPIC_DEFAULT_FABLE_MODEL=cc/claude-fable-5` removed (with it,
  every Fable call fails with an API error), so Fable resolves to `claude-fable-5-1`.
- **Schedule**: three cells at a time; the two arms of each fix were queued next to each other, so
  they ran in overlapping windows.
- **Scoring**: after the run, `tsc --noEmit` on the agent's tree, then the fix commit's own test
  files are copied over the worktree's and run with vitest. Every cell passed on the first run; no
  retry was needed.

### How the numbers are counted

- **Model calls**: distinct assistant message ids in the session transcript plus every
  `subagents/*.jsonl`. Check: output tokens summed from the transcripts equal the CLI's
  `modelUsage` totals.
- **Wall minutes**: process start to exit, including time spent waiting for background subagents.
- **Turns**: `num_turns` from the CLI JSON. When subagents ran in the background, the CLI reports
  only the final segment (marked \*); use model calls for those runs.
- **Cost**: `total_cost_usd` from the CLI JSON, subagents included.

## Results

| Fix | Mode | Model calls (main + sub) | Turns | Wall min | Cost | Spawns | Tests passed | tsc |
|---|---|---:|---:|---:|---:|---|---|---|
| `c1edd5a` | judgment | **15** (15 + 0) | 26 | **2.2** | $0.52 | 0 | 16/16 | clean |
| `c1edd5a` | orchestrator | 26 (6 + 20) | 3\* | 3.4 | $0.89 | 2 general-purpose (Opus) | 16/16 | clean |
| `18d9ce6` | judgment | **26** (26 + 0) | 48 | 5.1 | $1.40 | 0 | 118/118 | clean |
| `18d9ce6` | orchestrator | 57 (13 + 44) | 5\* | **5.0** | $1.84 | 3 implementer + 1 tester (Opus) | 118/118 | clean |
| `2574748` | judgment | **15** (15 + 0) | 27 | **3.0** | $0.62 | 0 | 124/124 | clean |
| `2574748` | orchestrator | 36 (14 + 22) | 12\* | 3.7 | $0.89 | 2 implementer (Opus) | 124/124 | clean |
| `1181ecd` | judgment | **23** (23 + 0) | 36 | **4.0** | $1.34 | 0 | 91/91 | clean |
| `1181ecd` | orchestrator | 26 (2 + 24) | 2 | 12.8 | $4.82 | 1 general agent (Fable) | 91/91 | clean |
| `1e63818` | judgment | **26** (26 + 0) | 42 | **4.5** | $1.45 | 0 | 108/108 | clean |
| `1e63818` | orchestrator | 37 (4 + 33) | 4 | 5.7 | $1.77 | 1 general-purpose (Opus) | 108/108 | clean |
| `7f6a187` | judgment | **11** (11 + 0) | 17 | **2.5** | $0.64 | 0 | 44/44 | clean |
| `7f6a187` | orchestrator | 18 (4 + 14) | 4 | 3.3 | $0.84 | 1 general-purpose (Opus) | 44/44 | clean |

Bold = the lower value of the pair.

### Per mode

| | Judgment | Orchestrator | Orchestrator ÷ judgment |
|---|---:|---:|---:|
| p50 model calls | **19** | 31 | 1.6× |
| p50 wall time | **3.5 min** | 4.4 min | 1.25× |
| p50 cost | $0.99 | $1.33 | 1.35× |
| Total cost, 6 runs | $5.97 | $11.05 | 1.85× |
| Max calls / max wall time | 26 / 5.1 min | 57 / 12.8 min | |
| Runs with a subagent | 0 / 6 | 6 / 6 | |
| Fixes with every historic test passing | 6 / 6 | 6 / 6 | |

## Observations

- **Judgment did not delegate where its text says to.** `18d9ce6` has three independent parts in
  disjoint files, which the judgment paragraph names as a case for parallel delegation. The session
  did all three itself: 26 calls and 5.1 min, against the orchestrator's 57 calls and 5.0 min with
  four agents. Doing it directly was cheaper here, but the written criterion did not drive the
  choice.
- **Orchestrator main sessions left the code changes to subagents** (2–14 main-session calls). They
  still ran checks, wrote CHANGELOG lines and committed; one made a one-line formatting edit. One run
  routed the flaky-test fix (`1181ecd`) to Fable as a hard bug: 12.8 min and $4.82, 3.6× the
  judgment run's cost for the same test result.
- **Both arms are far below the v7.4 field numbers** (04, F-022: delegated small fixes p50 65
  calls / 12.9 min). The replay removes hooks, MCP servers, the Jev gate, operator turns and
  long-lived main contexts, and its prompts are precise. The absolute numbers are therefore not
  comparable with 04; the ratio between arms here (1.6× calls) is much smaller than the field ratio
  (5.9×).
- **10 of 12 runs committed** (the project override asks for batched commits), so most times include
  the repo's pre-commit hook (prettier, lint, type-check).
- **One completeness gap the tests do not see.** `18d9ce6` and `2574748` also call for updating the
  installed copy `.claude/hooks/jev-gate.sh`. Claude Code blocks writes under `.claude/` in a
  headless session; only the `18d9ce6` orchestrator run ended with the copy updated. The covering
  tests use `templates/hooks/jev-gate.sh`, so they pass either way. In an interactive session the
  operator would approve the write.

## Caveats

- **Small sample.** 6 fixes (the task item asks for ~20), one run per cell, no variance estimate.
  The call median (19 against a limit of 20) could flip with one different run.
- **Narrow selection.** All six fixes come from this repo's v7 era, and four touch the Jev gate. The
  prompts state the problem and the expected behaviour precisely, which is easier than a real bug
  report.
- **Machine load.** Three cells ran at a time on a loaded machine, while the main session ran its
  own agents. Both arms of a fix overlapped in time, which spreads the load evenly but does not
  remove it.
- **Not an operator's environment.** No user hooks, plugins, MCP servers or auto-memory, and
  permissions were pre-approved. Wall times contain no human permission waits.
- **Harness denials.** The extra git deny rules blocked 3 commands in the `18d9ce6` judgment run
  (each contained `git tag --list` or `git stash list`). Claude Code's `.claude/` write protection blocked
  4 writes across three runs (both `2574748` arms and the `18d9ce6` judgment run).
- **Dependencies from each parent's lockfile**, not the repo's current `node_modules` (see Method).
- **A pilot batch was discarded.** With only the `--allowedTools` list from the run plan, the agent
  on this Windows host used the PowerShell tool and `git -C` command forms, both denied, and could
  not run a single test. All 12 cells were rerun with the permissions described above; only the
  rerun is reported.

## Reproduction

Harness scripts (`run.sh`, `render.mjs`, `metrics.mjs`, `aggregate.mjs`) and raw outputs (CLI JSON,
diffs, tsc and vitest logs per cell) are in the session's OS temp directory under `rb-replay/`. That
directory is not kept. Transcripts are under `~/.claude/projects/C--Users-Bolado-AppData-Local-Temp-rb-replay-<fix>-<mode>/`.

| Fix | Judgment session | Orchestrator session |
|---|---|---|
| `c1edd5a` | `f33c803d` | `dba73719` |
| `18d9ce6` | `7c9158c6` | `fc792549` |
| `2574748` | `bec74f0d` | `1ff17ace` |
| `1181ecd` | `5c54bb4b` | `3eb4694b` |
| `1e63818` | `b00ce5c8` | `d391de46` |
| `7f6a187` | `e365cee5` | `97ca3c37` |
