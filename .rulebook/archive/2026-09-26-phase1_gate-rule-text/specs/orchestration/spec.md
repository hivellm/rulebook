# Orchestration — Entry gate (Jev)

## ADDED Requirements

### Requirement: Gate rule in CLAUDE.md
The generated CLAUDE.md SHALL open its `## Orchestration` section with the sentence
"Gate first: every operator prompt → `rulebook_gate {prompt}` (Jev); act on
`routing`; unavailable or undecided → these rules." and the generated always-loaded
context MUST stay within the 1600-token file budget without dropping any existing rule.

#### Scenario: Orchestration section starts with the gate rule
Given a project with the default file backend
When `generateClaudeMd` renders CLAUDE.md
Then the first line after `## Orchestration` starts with "Gate first: every operator prompt → `rulebook_gate {prompt}`"
And the orchestrator directive, model routing and CHANGELOG clauses are still present

#### Scenario: Budget holds
Given a lean TypeScript project
When CLAUDE.md, AGENTS.md, AGENTS.override.md and always-on rules are generated
Then their gpt-4 token total is at most 1600

### Requirement: Entry gate protocol in the orchestration spec
The orchestration spec SHALL contain a `## 3. Entry gate (Jev)` section that MUST state
what the gate receives, the 11 decisions (kind, needs_task, existing_task, model, agent,
skill, parallel, needs_operator_decision, risk_destructive_git, risk_os_scheduling,
risk_secrets) with their thresholds, how the main session acts on each `routing` field,
the fallback to the spec's rules when the gate is unavailable or undecided, that the gate
is called once per operator prompt, that subagents do not call the gate, and that
decisions are logged to `.rulebook/logs/gate.jsonl` only when `features.logging` is on,
without prompt text or key.

#### Scenario: Spec carries the full protocol
Given the orchestration template
When `generateCoreRules('orchestration')` renders it
Then it contains "Entry gate (Jev)", all 11 decision ids, the thresholds (0.6, 0.7, 0.3, 0.5) and "subagents do not call the gate"
And the later sections are numbered 4 to 7

#### Scenario: Gate unavailable
Given the gate returns `available:false` (no key, disabled, timeout or error)
When the main session reads the result
Then it proceeds under the orchestration spec's rules without blocking
