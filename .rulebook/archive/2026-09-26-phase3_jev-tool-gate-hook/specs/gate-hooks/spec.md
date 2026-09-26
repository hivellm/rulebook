# Gate Hooks Specification

## ADDED Requirements

### Requirement: Tool-call gate
When `gate.toolHook.enabled` is true, a `PreToolUse` hook on
`gate.toolHook.matcher` (default `Bash|Edit|Write`) SHALL send Jev one batched
request per tool call — a redacted summary of the call plus a small project
context — with one noul per criterion (`safe_reversible`,
`no_secret_exposure`, `follows_project_rules`, and `in_task_scope` when a task
is active), and MUST map the answers to a `permissionDecision`.

#### Scenario: Low probability denies
Given Jev returns `safe_reversible` = 0.3 and every other criterion ≥ 0.9
When the agent calls Bash with `rm -rf src/`
Then the hook MUST print `permissionDecision: "deny"` with a reason naming `safe_reversible` and 0.30

#### Scenario: Warn band asks
Given Jev returns `follows_project_rules` = 0.6 and every other criterion ≥ 0.9
When the agent calls a matched tool
Then the hook MUST print `permissionDecision: "ask"`

#### Scenario: Scope never denies
Given Jev returns `in_task_scope` = 0.1 and every other criterion ≥ 0.9
When the agent edits a file
Then the decision MUST be `ask`, not `deny`

#### Scenario: All criteria pass
Given every criterion is at or above `askBelow`
When the hook answers
Then it MUST print nothing and exit 0, and it MUST NOT emit `allow`

#### Scenario: One request per call
Given a matched tool call that misses the cache
When the hook runs
Then exactly one `systemOne()` request MUST be made

### Requirement: Cheap checks first
The tool gate MUST run the deterministic checks before any Jev call: the
installed `no-os-scheduling.sh` guard, then the destructive-git patterns. A
deterministic `deny` SHALL be returned as-is and a destructive-git match SHALL
return `ask` citing the Git safety rules; in both cases no Jev request MUST be
made. Tools that do not match the matcher SHALL be skipped with no output.

#### Scenario: OS scheduling short-circuits
Given the Bash command is `crontab -e`
When `jev-gate.sh tool` runs
Then it MUST print the guard's `deny` and the Jev fetch MUST NOT be called

#### Scenario: Destructive git asks without Jev
Given the Bash command is `git reset --hard HEAD~1`
When the hook runs
Then it MUST print `permissionDecision: "ask"` citing Git safety and make zero Jev requests

### Requirement: Secret redaction
Every summary sent to Jev MUST pass through `redactSecrets()`, which applies the
client's `redact()` and masks common credential shapes; the content of `.env*`
files MUST NOT be sent. The decision log SHALL store a hash of the summary,
never the command text, file content, or key.

#### Scenario: Token in a command
Given the Bash command `curl -H "Authorization: Bearer ghp_abc123def456" https://api.github.com`
When the summary is built
Then the state sent to Jev MUST NOT contain `ghp_abc123def456`

#### Scenario: Writing an env file
Given a Write to `.env.local` with `API_KEY=xyz`
When the summary is built
Then the preview MUST be `[env file — not sent]` and `xyz` MUST NOT appear in the state

### Requirement: Latency budget and cache
The tool gate SHALL stop waiting for Jev after `gate.toolHook.deadlineMs`
(default 2000 ms) and fail open. Identical calls (same redacted summary, tool
and active task) within `cacheTtlMs` (default 15 min) MUST reuse the cached
decision without a Jev request; only Jev answers SHALL be cached, never
fail-open results.

#### Scenario: Cache hit
Given a decision for `npm run build` was cached 1 minute ago
When the same call is made again
Then the hook MUST return the cached decision with zero Jev requests

#### Scenario: Cache expired
Given the cached entry is older than `cacheTtlMs`
When the same call is made
Then the hook MUST make a new Jev request

### Requirement: Tool gate fails open
On no key, `RULEBOOK_GATE=off`, TypeSafe opted out, timeout, network or HTTP
error, a bad response, unreadable stdin, or any thrown error, the tool gate
MUST exit 0 with no output so the normal permission flow applies.

#### Scenario: Jev down
Given the injected fetch rejects with a network error
When a matched tool call runs
Then the hook MUST exit 0 with empty stdout and write no cache entry

### Requirement: Tool gate installer
`applyClaudeSettings()` SHALL upsert exactly one `PreToolUse` entry with the
`jev-tool-gate` signature, the configured matcher and a `timeout`, after the
rulebook guard entries, when the tool gate is enabled, and MUST remove it when
disabled, never touching user entries; repeated runs MUST be idempotent.

#### Scenario: Custom matcher
Given `gate.toolHook.matcher` is `Bash`
When `rulebook update` applies settings
Then the `jev-tool-gate` entry MUST have `matcher: "Bash"` and a second run MUST report `changed: false`
