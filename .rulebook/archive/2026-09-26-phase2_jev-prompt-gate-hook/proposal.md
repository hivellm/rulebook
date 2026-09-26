# Proposal: phase2_jev-prompt-gate-hook

## Why
The Jev entry gate is advisory today: the main session has to remember to call
`rulebook_gate` (or `rulebook gate`) on every operator prompt, and nothing
happens when it forgets. A Claude Code `UserPromptSubmit` hook can run the same
gate automatically on every prompt, hand the routing to the model as context,
and stop only the rare prompt that asks for something rulebook forbids
outright. This also lays the hook plumbing (CLI entry point, wrapper script,
installer, config section) that the tool-call gate
(`phase3_jev-tool-gate-hook`) and the project-scope question
(`phase3_jev-project-scope`) build on.

## What Changes
- New CLI entry point `rulebook hook prompt-gate` (`src/cli/commands/hook.ts`,
  registered in `src/index.ts`): reads the Claude Code hook JSON from stdin,
  runs `runGate()` (`src/core/typesafe/gate.ts`) on `prompt` with a hook
  deadline, and prints one hook JSON answer on stdout.
- New module `src/core/typesafe/prompt-hook.ts`: turns a `GateResult` into a
  hook answer — `additionalContext` with the routing instruction and risk
  warnings, or `{"decision":"block","reason":…}` only for a high-confidence
  OS-scheduling request (Tier 1, never allowed). Destructive git and secrets
  never block here: the operator's own prompt is the authorization; they
  become warnings in the context.
- Fail-open: no key, `RULEBOOK_GATE=off`, TypeSafe opted out, timeout, network
  or bad response, unreadable stdin, or any thrown error → exit 0 with no
  output; the prompt goes through unchanged.
- New wrapper template `templates/hooks/jev-gate.sh` (installed to
  `.claude/hooks/jev-gate.sh`): finds the `rulebook` CLI (PATH, then
  `$CLAUDE_PROJECT_DIR/node_modules/.bin/rulebook`), passes stdin through, and
  exits 0 silently when the CLI is missing.
- Installer: `applyClaudeSettings()`
  (`src/core/claude/claude-settings-manager.ts`) gains `jevPromptGate`; it
  upserts one `UserPromptSubmit` entry (signature `jev-gate`) with a `timeout`,
  merges into user hooks without touching them, and removes the entry when the
  toggle is off. `init`, `update` and `claude setup` pass the toggle.
- Config: `RulebookConfig.gate.promptHook` in `src/types.ts`
  (`enabled`, `deadlineMs`, `blockThreshold`); on by default unless TypeSafe is
  opted out.
- Rule text: CLAUDE.md template, orchestration spec and `renderTypesafeRule()`
  say the hook runs the gate; the model calls `rulebook_gate` by hand only
  when no hook routing is in its context.

## Impact
- Affected specs: gate-hooks (new), gate (advisory rule modified)
- Affected code: src/cli/commands/hook.ts (new), src/core/typesafe/prompt-hook.ts (new), src/core/typesafe/gate.ts, src/core/claude/claude-settings-manager.ts, src/core/claude/typesafe-integration.ts, src/cli/commands/init.ts, update.ts, claude.ts, src/index.ts, src/types.ts, templates/hooks/jev-gate.sh (new), templates/core/claude-md.md, templates/core/orchestration.md
- Breaking change: NO (fail-open; `gate.promptHook.enabled: false`, `--no-typesafe` or `RULEBOOK_GATE=off` turns it off). It reverses the v7 "no UserPromptSubmit hook" rule (P0/F-002) on purpose; the settings-manager header and its test change with it.
- User benefit: every prompt is routed by Jev without the model having to remember; forbidden OS-scheduling requests stop before any work starts
