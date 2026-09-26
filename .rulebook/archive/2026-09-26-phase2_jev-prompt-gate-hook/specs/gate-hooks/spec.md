# Gate Hooks Specification

## ADDED Requirements

### Requirement: Automatic prompt gate
When the prompt hook is enabled, Claude Code SHALL run the Jev entry gate on
every operator prompt through a `UserPromptSubmit` hook
(`.claude/hooks/jev-gate.sh prompt` → `rulebook hook prompt-gate`), using the
same `runGate()` as the `rulebook_gate` MCP tool, and MUST inject the routing
into the model's context as `additionalContext`.

#### Scenario: Normal prompt gets routing context
Given a TypeSafe key is configured and Jev answers with no risk flag at or above 0.5
When the operator submits "add a --json flag to rulebook task list"
Then the hook MUST exit 0 and print a `hookSpecificOutput` with `hookEventName: "UserPromptSubmit"` and an `additionalContext` that starts with "Jev routing (rulebook prompt hook)" and contains `result.instruction`

#### Scenario: Context is bounded
Given a gate result whose instruction and warnings exceed 1024 bytes
When the hook builds `additionalContext`
Then the context MUST be at most 1024 bytes

#### Scenario: Model does not call the gate twice
Given the hook injected routing for the current prompt
When the model reads the orchestration rules
Then the rules MUST tell it to act on the injected routing and call `rulebook_gate` only when no hook routing is present

### Requirement: Blocking only on high-confidence forbidden requests
The prompt hook MUST block a prompt only when Jev is available and the
`risk_os_scheduling` probability is at or above `gate.promptHook.blockThreshold`
(default 0.9), returning `{"decision":"block","reason":…}` with a reason that
names the rule and how to turn the hook off. Destructive-git and secrets risks
SHALL NOT block at the prompt stage; they MUST appear as warning lines in the
context. Probabilities between 0.5 and 0.7 on any risk SHALL produce a warning,
never a block.

#### Scenario: OS scheduling request is blocked
Given Jev returns `risk_os_scheduling` = 0.95 and the threshold is 0.9
When the operator submits "add a crontab entry that runs the backup every night"
Then the hook MUST print `decision: "block"` with a reason that mentions OS-level scheduling and `gate.promptHook.enabled`, and exit 0

#### Scenario: Below the threshold is a warning
Given Jev returns `risk_os_scheduling` = 0.6
When the hook answers
Then it MUST NOT block and the context MUST contain an OS-scheduling warning line

#### Scenario: Destructive git asked by the operator
Given Jev returns `risk_destructive_git` = 0.98
When the operator submits "force-push my feature branch"
Then the hook MUST NOT block and the context MUST carry a destructive-git warning that points to the Git safety rules

### Requirement: Fail-open
The prompt hook MUST never stop a prompt because the gate could not run. On no
key, `RULEBOOK_GATE=off`, `integrations.typesafe.enabled: false`, a timeout, a
network or HTTP error, a bad response, unreadable stdin, an empty prompt, a
missing CLI, or any thrown error it SHALL exit 0 with no output. Its internal
deadline (`gate.promptHook.deadlineMs`, default 5000 ms) MUST be shorter than
the `timeout` written into settings.json.

#### Scenario: No key
Given neither the environment nor `<root>/.env` holds `TYPESAFE_API_KEY`
When the operator submits any prompt
Then the hook MUST exit 0 with empty stdout and make no network call

#### Scenario: Jev is slow
Given the injected fetch never resolves and the deadline is 1000 ms
When the hook runs
Then it MUST exit 0 with empty stdout within about 1000 ms

#### Scenario: CLI not installed
Given `rulebook` is neither on PATH nor in `node_modules/.bin`
When `jev-gate.sh prompt` runs
Then it MUST exit 0 with no output

### Requirement: Installer merge
`applyClaudeSettings()` SHALL install `.claude/hooks/jev-gate.sh` and upsert
exactly one `UserPromptSubmit` entry carrying the `jev-gate` signature and a
`timeout` when `jevPromptGate` is true, and MUST remove that entry when it is
false. It MUST NOT modify, reorder, or remove any hook entry it does not own,
and running it twice MUST leave settings.json byte-identical.

#### Scenario: User hook preserved
Given settings.json already has a user `UserPromptSubmit` hook `bash my-hook.sh`
When `rulebook update` applies settings with the prompt hook enabled
Then both entries MUST be present, the user entry first and unchanged

#### Scenario: Idempotent
Given settings were applied once with the prompt hook enabled
When they are applied again with the same desire
Then `changed` MUST be false and the file MUST be unchanged

#### Scenario: Turned off
Given the prompt hook entry exists and `gate.promptHook.enabled` is false
When `rulebook update` runs
Then no `jev-gate` entry MUST remain and the `UserPromptSubmit` key MUST be dropped if it is empty

## MODIFIED Requirements

### Requirement: Degradation without a key or network
The gate MUST never throw; when Jev cannot be used it SHALL return
`available: false` with a reason and an instruction to fall back to the
CLAUDE.md Orchestration rules. The gate itself stays advisory; the only
blocking path is the prompt hook's high-confidence OS-scheduling rule above.

#### Scenario: MCP tool never blocks
Given Jev returns `risk_os_scheduling` = 0.99
When `rulebook_gate {prompt}` is called through MCP
Then the result MUST be a normal routing with `risk.osScheduling: true` and nothing is blocked
