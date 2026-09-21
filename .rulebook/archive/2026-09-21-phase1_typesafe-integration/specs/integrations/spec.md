## ADDED Requirements

### Requirement: Plugin detection is the source of truth
The system SHALL read `~/.claude/plugins/installed_plugins.json` and treat `typesafe@typesafe-ai` as installed when that key holds at least one entry. A missing or unreadable file MUST read as "not installed".

#### Scenario: Installed
Given installed_plugins.json lists `typesafe@typesafe-ai` with one entry
When detection runs
Then it reports installed

#### Scenario: Missing registry
Given no installed_plugins.json exists
When detection runs
Then it reports not installed without throwing

### Requirement: Idempotent install
The system MUST NOT run the install commands when the plugin is already installed. When it is missing, the system SHALL run `claude plugin marketplace add typesafe-ai/skills` and then `claude plugin install typesafe@typesafe-ai`, tolerating a marketplace that already exists and surfacing a failed install with the command to run by hand.

#### Scenario: Already installed
Given the plugin is installed
When setup runs
Then no `claude` command is executed and the result says installed, not installedNow

#### Scenario: Fresh install
Given the plugin is not installed
When setup runs
Then both commands are executed in order and the result says installedNow

#### Scenario: claude CLI absent
Given `claude` is not on PATH
When setup runs
Then the result carries an error naming the two commands to run manually, and the rule file is still written

### Requirement: Token is instructed, never written
The system SHALL check `TYPESAFE_API_KEY` in the environment and report `tokenPresent`. When absent it SHALL emit instructions: create a key at https://console.typesafe.ai/keys, export `TYPESAFE_API_KEY` in the shell profile or the project's untracked `.env`, never commit it. The system MUST NOT write the token to any file.

#### Scenario: Token absent
Given TYPESAFE_API_KEY is unset
When setup runs
Then tokenPresent is false and the instructions mention the console URL and the variable name

### Requirement: Agent guidance
The system SHALL write `.claude/rules/typesafe.md` (rulebook-owned marker) telling the agent that TypeSafe/Jev is enabled, when to use the `/typesafe:typesafe-ai` skill, and that the key comes from `TYPESAFE_API_KEY`. Disabling SHALL remove that file only when it carries the marker.

#### Scenario: Rule written and removed
Given TypeSafe is enabled then disabled
When setup and teardown run
Then the rule file exists after setup with the marker and is gone after teardown

### Requirement: Opt-in through init and update
`rulebook init` SHALL ask "Enable TypeSafe (Jev)?" only in interactive runs, defaulting to no, and SHALL persist the answer as `integrations.typesafe.enabled` in rulebook.json. `--typesafe` enables without asking. `rulebook update` SHALL re-run setup when enabled, ask once when never asked in an interactive run, and never ask again once an answer is stored.

#### Scenario: Declined once
Given the operator answers no on init
When update runs interactively later
Then no TypeSafe prompt appears and integrations.typesafe.enabled is false
