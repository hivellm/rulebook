# 05 — TML Hooks for Teams & Post-Compaction

Two production hooks already running in `F:\Node\hivellm\tml\.claude\hooks\` validate features that should be **first-class in v5.3.0**.

## B.1 `enforce_team_for_background_agents.sh` (PreToolUse on `Agent`)

Policy enforced via stdin JSON → permission decision:
- Foreground `Agent` calls → always allowed
- Background `Agent` calls (`run_in_background: true`) → **denied** unless `subagent_type == "team-lead"` OR `team_name` is set
- Deny reason points the LLM at the CLAUDE.md section "Multi-Agent Work MUST Use Teams"

Why this matters: standalone parallel background agents cannot communicate; only Teams expose `SendMessage`. Without the hook, models silently spawn isolated workers and lose coordination.

**v5.3.0 action — F-NEW-1 (P0):**
- Ship `templates/hooks/enforce-team-for-background-agents.sh` (+ `.ps1` for Windows-native shells)
- Auto-wire in generated `.claude/settings.json` under `hooks.PreToolUse[].matcher: "Agent"` when the project enables `multi_agent: true` in `.rulebook` config
- Add matching rule `templates/rules/multi-agent-teams.md` so the deny reason has a concrete doc to cite
- Requires env `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — `rulebook init` should set it in generated settings.json (also seen in tml settings: lines 25, 50)

## B.2 `on-compact-reinject.sh` (SessionStart matcher: `compact`)

Re-injects critical architectural context after Claude Code compacts the conversation. The TML version dumps a ~30-line cheat sheet: pipeline diagram, "critical reminders" (which DLL is which, which build script to use, MCP-vs-bash policy), key file paths, library quick reference.

Why this matters: post-compaction, the model loses CLAUDE.md context until it re-reads it. A SessionStart hook restores the load-bearing 30 lines instantly — far cheaper than a full re-read and immune to compaction.

**v5.3.0 action — F-NEW-2 (P0):**
- New file: `.rulebook/COMPACT_CONTEXT.md` (user-editable, ~30–50 lines, "what the model MUST remember after compaction")
- Auto-generated hook `templates/hooks/on-compact-reinject.sh` that `cat`s this file
- Wired in settings.json under `hooks.SessionStart[].matcher: "compact"`
- `rulebook init` seeds `COMPACT_CONTEXT.md` from detected stack (e.g. for a Rust+LLVM project: build command, key crates, forbidden ops)
- This is the **third pillar** of session continuity alongside `STATE.md` (machine-written) and `PLANS.md` (human scratchpad)

## B.3 Settings.json patterns worth standardizing

From `F:\Node\hivellm\tml\.claude\settings.json`, these env vars should be defaults in `rulebook init` output (with comments explaining each):

| Var | TML value | Why |
|---|---|---|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `1` | Required for Teams feature |
| `BASH_DEFAULT_TIMEOUT_MS` | `300000` | Long builds (TML compiler) |
| `BASH_MAX_TIMEOUT_MS` | `1200000` | Very long builds |
| `BASH_MAX_OUTPUT_LENGTH` | `200000` | Large compiler output |
| `MCP_TOOL_TIMEOUT` | `600000` | MCP test runs |
| `MAX_THINKING_TOKENS` | `32000` | Deep reasoning on bugs |
| `MAX_MCP_OUTPUT_TOKENS` | `50000` | Big MCP results |
| `DISABLE_TELEMETRY` | `1` | Privacy default |

**v5.3.0 action:** add a `rulebook init --profile {compiler|webapp|library|research}` flag that picks sensible env defaults. The `compiler` profile mirrors TML's tuning above.

Both hooks feed directly into the [03-claude-md-strategy.md](./03-claude-md-strategy.md) goal: the generic regenerated CLAUDE.md stays small precisely *because* a separate compaction-resilient channel exists for the load-bearing reminders.
