# Proposal: phase1_default-model-opus

## Why
v7.4.0 routes work by model: Fable for architecture, complex bugs and code review;
Opus for edits, tests, docs and refactoring; Haiku for research and summaries.
`sonnet` is no longer part of that routing, yet `rulebook claude` still writes
`sonnet` as the session default model into `.claude/settings.json`, and the CLI
help text and config type comments still describe the old opus/sonnet/haiku split.

## What Changes
- `src/cli/commands/claude.ts`: new exported constant `DEFAULT_CLAUDE_MODEL = 'opus'`;
  `claudeSetupCommand` uses it when `--model` is not given.
- `src/index.ts`: `rulebook claude --model` help text derives its "(default: ...)"
  from the constant, so it now reads "(default: opus)".
- `src/types.ts`: `agentFramework.modelAssignment` comments describe the v7.4 routing
  (fable = architecture/review, opus = edits/tests/docs, haiku = research).
- `tests/claude-default-model.test.ts`: covers the default, the `--model` override,
  the help text, and the value written to settings.json.

## Impact
- Affected specs: claude (default model written by `rulebook claude`)
- Affected code: src/cli/commands/claude.ts, src/index.ts, src/types.ts
- Breaking change: NO (the model is only written when settings.json has none; an
  existing user choice is never overwritten)
- User benefit: new Claude Code setups start on the model the v7.4 routing uses for
  everyday work instead of a model rulebook no longer routes to.
