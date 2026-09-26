# Integrations — TypeSafe on by default (v7.4)

## ADDED Requirements

### Requirement: TypeSafe Default-On Decision
`decideTypesafe` SHALL enable the TypeSafe integration unless the operator opted out, without
prompting. `--typesafe` MUST enable and persist; `--no-typesafe` MUST disable and persist; a stored
boolean MUST be honoured when no flag is given; with no flag and nothing stored it MUST enable and
persist `{ enabled: true, askedAt }`.

#### Scenario: Nothing stored and no flag
Given a project whose rulebook.json has no `integrations.typesafe`
When `rulebook init`, `rulebook update` or `rulebook claude setup` runs without a TypeSafe flag
Then the integration is enabled and `integrations.typesafe.enabled: true` is persisted with `askedAt`

#### Scenario: Stored opt-out is sticky
Given rulebook.json stores `integrations.typesafe.enabled: false`
When `rulebook update` runs without a TypeSafe flag
Then the integration stays disabled and the stored value is unchanged

#### Scenario: Explicit opt-out flag
Given any stored state
When a command runs with `--no-typesafe`
Then the integration is disabled and `enabled: false` is persisted

### Requirement: TypeSafe Key Detection
`hasTypesafeToken` SHALL report the key present when `TYPESAFE_API_KEY` is set in the environment
or, failing that, defined in `<projectRoot>/.env`. It MUST NOT print, log, persist or assign the key.

#### Scenario: Key only in the project .env
Given `TYPESAFE_API_KEY` is unset in the environment and `<projectRoot>/.env` defines it
When setup checks for the key
Then `tokenPresent` is true and no output contains the key value

### Requirement: Slim TypeSafe Rule File
`renderTypesafeRule()` MUST start with `<!-- rulebook:typesafe -->` and SHALL stay within about
90 tokens while naming the `/typesafe:typesafe-ai` skill, the `rulebook_gate` tool and
`TYPESAFE_API_KEY`.

#### Scenario: Rule written on setup
Given TypeSafe is enabled
When setup writes `.claude/rules/typesafe.md`
Then the file begins with the marker, mentions `rulebook_gate` and `TYPESAFE_API_KEY`, and is under the token bound
