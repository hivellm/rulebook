# Claude setup — default model (v7.4)

## ADDED Requirements

### Requirement: Opus Default Model
`rulebook claude` SHALL write `opus` as the `model` in `.claude/settings.json` when
no `--model` flag is given and settings.json has no `model` set.

#### Scenario: No model configured
Given a project whose `.claude/settings.json` has no `model` key
When the user runs `rulebook claude` without `--model`
Then `.claude/settings.json` contains `"model": "opus"`

### Requirement: Explicit Model Wins
An explicit `--model <model>` MUST take precedence over the default, and an existing
user-authored `model` in settings.json MUST NOT be overwritten.

#### Scenario: Explicit flag
Given a project whose `.claude/settings.json` has no `model` key
When the user runs `rulebook claude --model haiku`
Then `.claude/settings.json` contains `"model": "haiku"`

#### Scenario: Existing user choice
Given a `.claude/settings.json` that already sets `"model": "claude-opus-4-8"`
When the user runs `rulebook claude`
Then the `model` value stays `"claude-opus-4-8"`

### Requirement: Help Text Matches Default
The `rulebook claude --model` help text SHALL name the same default model the
command writes.

#### Scenario: Help output
Given the rulebook CLI
When the user runs `rulebook claude --help`
Then the `--model` option reads "Default model for settings.json (default: opus)"
