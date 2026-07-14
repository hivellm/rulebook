# Spec delta: rulebook (phase6_post-v7-context-optimization)

## ADDED Requirements

### Requirement: Command surface MUST NOT duplicate the MCP tool surface

Rulebook SHALL NOT install slash-command files whose function is fully covered
by the consolidated MCP tools (`rulebook_task`, `rulebook_memory`,
`rulebook_session`, `rulebook_rules`, `rulebook_skill`). The MCP schema is the
single source of truth for verb discovery.

#### Scenario: Fresh install ships no redundant command files

- Given a fresh `rulebook init --yes --tools claude-code` in an empty project
- When the install completes
- Then `.claude/commands/` contains no `rulebook-*.md` file duplicating an MCP tool verb
- And the installed-file count is ≤ 20

#### Scenario: Update strips previously installed redundant commands

- Given a project installed by rulebook v7.0.0 with 12 `.claude/commands/rulebook-*.md` files bearing the rulebook sentinel
- When the user runs `rulebook update`
- Then the sentinel-bearing `rulebook-*.md` command files are removed
- And any command file without the sentinel (user-adopted) is preserved verbatim

### Requirement: Overhead benchmark MUST separate always-on from on-demand context

`scripts/measure-overhead.mjs` SHALL report two totals: always-on context
(CLAUDE.md, AGENTS.override.md, skills/commands frontmatter, MCP schemas) and
on-demand context (path-scoped `.claude/rules/*`, `.rulebook/` specs and
state). Only the always-on total SHALL be budgeted against the 2,500-token
ceiling.

#### Scenario: Path-scoped rules do not count against the static budget

- Given a generated `.claude/rules/typescript.md` with valid `paths:` frontmatter
- When the overhead measurement runs
- Then its tokens appear in the on-demand total, not the always-on total
- And the always-on budget verdict is computed without them

#### Scenario: Lost paths frontmatter fails the measurement

- Given a `.claude/rules/*.md` file bearing the rulebook sentinel whose `paths:` frontmatter has been removed
- When the overhead measurement runs
- Then the report fails with an explicit error naming the file

## MODIFIED Requirements

### Requirement: AGENTS.md content MUST NOT restate CLAUDE.md rules

For installs targeting Claude Code, the generated AGENTS.md SHALL contain only
AGENTS-specific content (task format, specs index, language-rules pointer) and
SHALL reference CLAUDE.md for shared values, git-safety, and orchestration
rules instead of paraphrasing them.

#### Scenario: Generated AGENTS.md is a thin index

- Given `rulebook init` or `rulebook update` generating both root memory files
- When AGENTS.md is written
- Then no rule stated in CLAUDE.md is restated in AGENTS.md
- And the combined always-on token cost of both files is lower than the v7.0.0 baseline (545 + 634 tokens)

### Requirement: Language guidance MUST have a single canonical copy

Each supported language SHALL have exactly one canonical guidance payload —
the path-scoped `.claude/rules/<lang>.md` file. `.rulebook/specs/<lang>.md`
SHALL NOT carry a duplicate body; at most it holds a pointer to the rule file.

#### Scenario: TypeScript payload exists once

- Given a project initialized with TypeScript support
- When generation completes
- Then the five non-negotiables + conventions body exists only in `.claude/rules/typescript.md`
- And AGENTS.md "Language & Framework Rules" points at that rule file
