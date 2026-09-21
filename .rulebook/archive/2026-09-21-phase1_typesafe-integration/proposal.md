# Proposal: phase1_typesafe-integration

## Why
TypeSafe (https://typesafe.ai) gives agents typed judgments (routing, ranking,
extraction, verification) through its System One model Jev, and ships a Claude
Code plugin (`typesafe@typesafe-ai`) with the skill that teaches how to build
with it. Teams that want it today install the plugin by hand, forget the API
key, and nothing in the generated rules tells the agent the capability exists.
Rulebook already sets up the Claude Code side of a project on `init` and
`update`; TypeSafe should ride the same path — offered, never imposed, because it
only works with a token the operator has to create.

## What Changes
- `src/core/claude/typesafe-integration.ts`: detect the plugin in
  `~/.claude/plugins/installed_plugins.json` (`typesafe@typesafe-ai`), install it
  only when missing (`claude plugin marketplace add typesafe-ai/skills` then
  `claude plugin install typesafe@typesafe-ai`), check `TYPESAFE_API_KEY`, write
  `.claude/rules/typesafe.md` telling the agent when to reach for the
  `/typesafe:typesafe-ai` skill and how the key is handled, and print
  token instructions (create at https://console.typesafe.ai/keys, export the
  variable, never commit it).
- `rulebook init`: in interactive runs ask "Enable TypeSafe (Jev)?" (default no);
  `--typesafe` enables without asking. The answer is persisted as
  `integrations.typesafe.enabled` in `rulebook.json`.
- `rulebook update`: when enabled, re-verify the plugin (install if missing),
  refresh the rule file and warn if the key is absent; when never asked and
  interactive, ask once and persist the answer. `--typesafe` enables.
- `rulebook claude --typesafe` applies the same setup on demand.
- The token is never written by rulebook: instructions only.

## Impact
- Affected specs: rulebook (integrations)
- Affected code: src/core/claude/typesafe-integration.ts, src/types.ts,
  src/cli/commands/{init,update,claude}.ts, src/index.ts
- Breaking change: NO (opt-in, off by default)
- User benefit: one prompt turns TypeSafe on for a project, idempotently, with the
  agent told to use it
