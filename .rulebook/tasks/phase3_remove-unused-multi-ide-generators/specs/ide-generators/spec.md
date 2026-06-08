# Spec: ide-generators

## REMOVED Requirements

### Requirement: Unused IDE generators removed
Rulebook MUST NOT generate integration files for OpenCode, Gemini, Codex,
Windsurf, or Copilot. These targets MUST NOT be selectable in `init`/`update`
or in `ProjectConfig.ides`.

#### Scenario: Init emits only retained IDE targets
Given a project is initialized with Rulebook
When IDE integration files are generated
Then only Claude Code and Cursor outputs are produced
And no OpenCode/Gemini/Codex/Windsurf/Copilot files are written

#### Scenario: Legacy config listing a removed IDE loads cleanly
Given a `rulebook.json` whose `ides` lists `windsurf`
When the config manager loads it
Then `windsurf` is dropped from the resolved targets
And no error aborts the load

## ADDED Requirements

### Requirement: Claude Code and Cursor retained
The Claude Code and Cursor generators MUST remain first-class and independent of
the removed generators.

#### Scenario: Cursor generation unaffected by removal
Given the removed IDE generators are gone
When `rulebook init` runs with `ides: ["cursor"]`
Then the Cursor `.cursor/` output is produced as before
