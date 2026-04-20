# Spec delta — rulebook-terse (ADDED in phase0_terse-foundations)

Source: docs/analysis/caveman/05-rulebook-adoption-proposal.md

## ADDED Requirements

### Requirement: Intensity-level contract

The `rulebook-terse` skill SHALL define exactly four intensity levels (`off`, `brief`, `terse`, `ultra`) and no more. Each level MUST have a calibrated before/after example in the skill file so the model can anchor compression depth against a known reference.

#### Scenario: Skill loaded at session start

- Given a Rulebook project with `rulebook-terse` installed and default intensity `brief`
- When Claude Code starts a session and fires the SessionStart hook
- Then the filtered SKILL.md body MUST be emitted to stdout as hidden `additionalContext`
- And only the `brief` row of the intensity table MUST remain after filtering
- And only the `brief` example line MUST remain in the examples section
- And the user MUST NOT see the injection in their transcript

#### Scenario: Level switch via slash command

- Given an active session with `rulebook-terse` mode `brief`
- When the user sends `/rulebook-terse ultra`
- Then the UserPromptSubmit hook MUST write `ultra` to the flag file via `safeWriteFlag`
- And subsequent responses MUST follow the `ultra` intensity rules
- And the mode MUST persist across subsequent turns until changed

### Requirement: Auto-clarity escape hatch

The skill MUST drop compression for the current turn when any of five trigger contexts applies: security warnings, destructive-op confirmations, quality-gate failures, multi-step sequences where fragment ambiguity risks misread, or explicit user confusion.

#### Scenario: Destructive op confirmation

- Given an active `terse` session
- When the model is about to emit a `DROP TABLE` confirmation
- Then the response MUST be written in full prose for that turn
- And compression MUST resume on the next turn after the confirmation is past

#### Scenario: Quality-gate failure

- Given an active `brief` session and a failing type-check
- When the type-check output is reported back through the model
- Then the model MUST describe the failure in full prose, preserving file paths and error messages exactly

### Requirement: Boundary protection

The skill MUST NOT alter the following output classes regardless of intensity level: fenced code blocks, inline code, file paths, URLs, version numbers, dates, error messages (verbatim), command strings, test assertions.

#### Scenario: Code block pass-through

- Given an active `ultra` session
- When the response contains a fenced JavaScript code block
- Then the contents of the code block MUST be byte-identical to what would be produced in `off` mode
- And only the prose surrounding the block may be compressed

### Requirement: Sub-skill independence

`rulebook-terse-commit` and `rulebook-terse-review` MUST be independent skills with their own YAML frontmatter, own activation triggers, and own auto-clarity rules. They MUST NOT share state with the base `rulebook-terse` mode flag file.

#### Scenario: Commit sub-skill with base mode off

- Given a session where base `rulebook-terse` mode is `off`
- When the user invokes `/rulebook-terse-commit`
- Then commit messages for that invocation MUST follow the `rulebook-terse-commit` format
- And the base-mode `off` state MUST remain unchanged

### Requirement: Tier-aware default intensity

When no explicit mode is set, the SessionStart hook MUST select the default intensity from the active agent tier:

- `research` / haiku → `terse`
- `standard` / sonnet → `brief`
- `core` / opus → `off`
- `team-lead` → `brief`

#### Scenario: Fresh session with haiku tier

- Given a new Rulebook session dispatched to a `researcher` (haiku) agent
- And no explicit `RULEBOOK_TERSE_MODE` env var is set
- When the SessionStart hook fires
- Then the default intensity MUST resolve to `terse`
- And the flag file MUST contain `terse`

### Requirement: Safety invariants for flag-file I/O

All reads and writes of the mode flag file MUST go through a shared `safe-flag-io` module. The module MUST reject symlinks at the target file and at the immediate parent directory, use `O_NOFOLLOW` on open where supported, write atomically via temp + rename with `0600` mode, cap reads at `MAX_FLAG_BYTES = 32`, and validate read contents against a whitelist before returning.

#### Scenario: Symlink attack on flag path

- Given an attacker with write access to `$RULEBOOK_CONFIG_DIR`
- When the attacker replaces `.rulebook-terse-mode` with a symlink to `~/.ssh/id_rsa`
- And the UserPromptSubmit hook attempts to read the flag
- Then `readFlag` MUST return `null`
- And the hook MUST emit no attention anchor
- And the private key MUST NOT appear in any model context or log output

### Requirement: Evaluation harness

All changes to skill behavior MUST be measured against a three-arm harness (`baseline` / `terse` / `rulebook-terse`). The honest delta is `rulebook-terse vs terse`. A skill whose average lift over `terse` is < 15% MUST be flagged by the harness for review.

#### Scenario: Regression on a skill

- Given a pull request that modifies `templates/skills/core/rulebook-terse/SKILL.md`
- When CI runs the offline `measure.ts` step using committed snapshots
- Then the PR comment MUST include a delta table with per-prompt lift over `terse`
- And the gate check MUST fail if the average lift drops below the configured threshold
