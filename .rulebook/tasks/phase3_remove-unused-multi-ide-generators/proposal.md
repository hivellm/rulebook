# Proposal: phase3_remove-unused-multi-ide-generators

## Why

Rulebook generates integration files for six external tools beyond Claude Code
(OpenCode, Gemini, Codex, Windsurf, Copilot, Cursor). Adoption across the 8
sampled projects is near-zero and isolated:

- OpenCode: 1 project (Cortex)
- Cursor: 1 project (Rulebook)
- Windsurf: 1 project (Rulebook)
- Copilot: 1 project (Vectorizer)
- Gemini: 0 projects
- Codex: 0 projects

Every project's primary surface is Claude Code. The multi-IDE generators add
templates, translators, and per-tool output that almost nobody keeps, at real
maintenance cost.

## What Changes

- Keep **Claude Code** (primary) and **Cursor** (the default `ides` entry and
  the most standard external target).
- Remove the generators, templates, and translators for **OpenCode, Gemini,
  Codex, Windsurf, Copilot**: their output writers in
  `src/core/generators/workflow-generator.ts` (`generateIDEFiles` /
  `generateAICLIFiles`), the per-tool template blocks (e.g. the OpenCode rules
  template), and any detector/config plumbing that targets them.
- Update `ProjectConfig.ides` and detection so removed tools are no longer
  selectable; normalize legacy configs that still list them.

## Impact

- Affected specs: `specs/ide-generators/spec.md` (this task)
- Affected code: `src/core/generators/workflow-generator.ts`,
  `src/core/generators/*` IDE/CLI writers, `templates/` per-tool blocks,
  `src/core/detect/detector.ts`, config-manager, related tests
- Breaking change: YES — removes IDE targets from `rulebook init`/`update`
  (target release 6.0.0). Already-generated files in user repos are left in
  place (no deletion of user files); they simply stop being regenerated.
- User benefit: smaller template/generator surface; faster init; the two
  targets people actually use (Claude Code, Cursor) remain first-class.

## Note

The keep/remove line (Claude + Cursor) is tunable. Gemini and Codex have zero
adoption and are unambiguous removals; OpenCode/Windsurf/Copilot have a single
niche adopter each and are removed under the user's "remove unused" decision.
