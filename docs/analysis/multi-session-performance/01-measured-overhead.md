# 01 — Hook cost per tool call

Measured 2026-10-14. Two sources: a harness that launches each hook exactly as Claude Code does on
Windows (`bash.exe -c "<settings command>"`, payload on stdin, 1 warm-up + 3 runs, median; CPU at
47–63 % from other work), and the `durationMs` Claude Code records for every hook in the transcripts of
the last 3 days (379 files, main sessions and subagents). Scripts: session scratchpad
`work/hookperf/` (`bench.mjs`, `session-cost.mjs`, `slowpath-insitu.mjs`).

Hooks on one event run in parallel, so the wall cost of a call is the slowest hook; the marginal cost of
rulebook is the slowest hook minus the slowest non-rulebook hook on the same call.

## F-001 — The two bash guards are the slowest PreToolUse hook on 98 % of the calls they run on

- **Evidence:** `.claude/settings.json` (PreToolUse `Edit|Write` → `protect-task-scaffolding.sh`,
  `Bash|Edit|Write` → `no-os-scheduling.sh`); transcript `durationMs`.
- **Numbers (in-situ, 3 days):**

  | Hook | Calls | p50 | p90 | Mean | Total |
  |---|---:|---:|---:|---:|---:|
  | `no-os-scheduling.sh` | 29,547 | 146 ms | 493 ms | 339 ms | 10,013 s |
  | `protect-task-scaffolding.sh` | 2,829 | 154 ms | 551 ms | 342 ms | 968 s |
  | `cortex-hook` PreToolUse (user-level) | 39,681 | 102 ms | 292 ms | 234 ms | 9,269 s |
  | `cortex-hook` PostToolUse (user-level) | 38,830 | 96 ms | 226 ms | 172 ms | 6,677 s |

  A rulebook guard was the slowest PreToolUse hook in 28,882 of 29,516 calls (97.9 %). Rulebook's
  marginal cost over cortex: mean +93 ms per Bash/Edit/Write call.
- **Per session (blocked agent-seconds, summed over parallel subagents):**

  | Session | Tool calls | Rulebook extra over cortex |
  |---|---:|---:|
  | UzPainter `06e8fc50` | 27,618 | 2,289 s (83 ms/call) |
  | Synap `468e3371` | 4,000 | 330 s (83 ms/call) |
  | Rulebook `8e80b09e` | 491 | 27 s (54 ms/call) |
  | ar-v3-dashboard `c442b5f4` | 351 | 14 s (41 ms/call) |

  Inside parallel subagents the guards run 2–3× slower than in the main thread (UzPainter subagents:
  `no-os-scheduling.sh` 24,424 runs at avg 331 ms, 8,089 s of summed hook time). The cause is the
  keyword prefilter sending ordinary text down the slow path (F-002), not spawn contention: Claude Opus
  re-measured the same `git status` call at 134–165 ms with the description "Show working tree status"
  and 309–371 ms with "Look at the working tree". Summed durations are elapsed hook time, not CPU time,
  and summed subagent time is not session critical-path time.
- **Impact:** for a typical 30-call turn (Bash 79 %, Write 5 %, Edit 5 %), rulebook adds 1.0–2.5 s;
  all hooks together cost 7.0 s (p50) to 14.3 s (mean). Summed over heavy delegated sessions it is the
  largest measured rulebook hook cost.
- **Confidence:** high. **Rulebook-attributable:** yes.

## F-002 — The guards' keyword prefilter sends prose down the slow path, and causes false denials

- **Evidence:** `no-os-scheduling.sh` prefilter matches `' at '`, `"at `, `batch` and scheduler names
  anywhere in the payload, including file contents and heredoc text.
- **Numbers:** slow path costs +215–242 ms over cortex vs +37–55 ms on the fast path. Slow-path share:
  Bash 4.7 % (1,481 / 31,557), Edit 15.3 % (275 / 1,800), **Write 48.2 % (989 / 2,050)**. Triggers are
  almost all prose: `" at "` 2,538 times, `batch` 321. Since 09-26 the guard denied 3 real tool calls,
  all false positives (UzPainter heredocs with "; at 1024", "(at 256 k)"). `protect-task-scaffolding`
  denied 8 Writes, its intended job.
- **Reproduced while writing this file:** a Bash heredoc that wrote this analysis (markdown that names
  scheduler commands as examples) was denied with "No OS-level scheduling (Tier 1 #7)".
- **Confidence:** high. **Rulebook-attributable:** yes.

## F-003 — Most of each guard's cost is the shell layer, not the check

- **Numbers (harness, median):** outer bash `-c true` 73–81 ms; two nested shells (how the guards run)
  104–120 ms; `x="$(cat)"` on 1.5 KB stdin 125–128 ms vs builtin `read` 75–91 ms; guard fast path
  134–141 ms; same guard in exec form (one bash, no outer shell) 92–103 ms.
- **Confidence:** high. **Rulebook-attributable:** yes.

## F-004 — Claude Code can enforce both guards without spawning anything

- **Evidence:** code.claude.com/docs/en/hooks and /permissions (fetched 2026-10-14).
- **Options:**
  - **`permissions.deny` rules**, evaluated in-process; deny wins over every allow, so `Bash(*)` and
    `acceptEdits` do not weaken them; Bash rules are checked per subcommand, which removes the prose
    false positives. OS scheduling: `Bash(crontab *)`, `Bash(schtasks *)`, `Bash(launchctl load *)`
    (+ bootstrap/enable/submit/kickstart), `Bash(systemd-run *--on-*)`, `Bash(systemctl *.timer*)`,
    `Bash(at *)`, `Bash(batch *)`, `PowerShell(Register-ScheduledTask *)` (+ New-/Set-/Enable-,
    `Register-ScheduledJob`), and `Edit(//etc/cron*/**)`, `Edit(//var/spool/cron/**)`,
    `Edit(**/LaunchAgents/*.plist)`, `Edit(**/LaunchDaemons/*.plist)`, `Edit(//etc/systemd/**/*.timer)`.
    Task scaffolding: `Edit(/.rulebook/tasks/*/proposal.md)`, `Edit(/.rulebook/tasks/*/.metadata.json)`.
  - **Pitfall:** `Write(path)` rules "are accepted but never consulted"; `Edit(...)` rules cover the
    Write tool, `>` redirects and `tee`. The rules must be written as `Edit(...)`.
  - **Hook `if` field:** one permission rule per handler, evaluated before spawning. With
    `if: "Edit(**/.rulebook/tasks/**)"` the scaffolding guard would have spawned for 122 of 3,850
    Edit/Write calls (3.2 %).
  - **Exec form** (`args` present, no shell): 141 → 92 ms per guard. Caution: a bare `bash` can resolve to
    WSL's `System32\bash.exe` on machines with a different PATH order.
- **Gaps:** deny rules also block read-only forms (`crontab -l`, `schtasks /query`); they do not see the
  same program inside `sh -c`, a full path or `powershell -Command`; a rule cannot tell creating a task
  file from editing it, so edits to an existing `proposal.md` would have to go through `rulebook_task`.
  Codex has no deny-rule equivalent.
- **Confidence:** high (documented behaviour; not yet tested end-to-end). **Rulebook-attributable:** yes (opportunity).

## F-005 — The user-level cortex hooks cost more per call than rulebook's, and never decide anything

- **Evidence:** `~/.claude/settings.json` and `~/.codex/hooks.json` run `cortex-hook.exe` on PreToolUse
  `*` (blocking), PostToolUse `*` (`--fire-forget`), UserPromptSubmit, Stop, SubagentStop, Notification.
- **Numbers:** mean 234 ms PreToolUse + 172 ms PostToolUse on every tool, Read and Grep included.
  Cortex answered `{}` on 100 % of 39,958 PreToolUse and 39,096 PostToolUse calls. `--fire-forget`
  only skips reading the reply; Claude Code still waits for the process to exit. Spawn alone 99–110 ms.
  UzPainter: 6,570 s PreToolUse + 4,643 s PostToolUse of cortex in one session.
- **Impact:** about 6–12 s per 30-call turn. `async: true` on both would remove ~170–234 ms per call.
- **Confidence:** high. **Rulebook-attributable:** no (rulebook can detect and report it).

## F-006 — Other hooks on the same path: the Codex plugin stop gate and project-owned hooks

- **Numbers:** the Codex plugin's `stop-review-gate-hook.mjs` on every Stop, p50 320 ms (UzPainter 452
  runs = 222 s). UzEngine's own `block-destructive-git.sh` 1,780 ms and `clean-shader-cache.sh` 1,611 ms
  per matching Bash call; UzEngine still wires retired v6 rulebook hooks (`enforce-mcp-for-tasks`,
  `no-deferred`, `no-shortcuts`) that fail on every run (269 non-blocking errors each). Assets3D's python
  prompt hook timed out 4 times (11–21 s). Edit/Write take 1.2–1.5 s p50 in every session, controls
  included; hooks are only 0.12–0.32 s of that.
- **Confidence:** high. **Rulebook-attributable:** no, except the leftover v6 hook entries that
  `rulebook update` did not strip (partly).
