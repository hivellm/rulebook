# Proposal: phase1_typesafe-default-on

## Why
The Jev entry gate (`rulebook_gate`) needs TypeSafe in every project, but v7.3 only
offered it behind an interactive yes/no prompt that defaulted to "no" and never enabled it in
non-interactive runs. v7.4 makes TypeSafe on by default while keeping an explicit, sticky opt-out,
and slims the always-loaded rule file so default-on does not inflate every project's context.

## What Changes
- `decideTypesafe` (src/cli/commands/typesafe.ts) drops the inquirer prompt and the `interactive`
  input. Precedence: `--typesafe` → on; `--no-typesafe` → off; stored boolean → honoured (a stored
  "no" stays "no"); nothing stored → on, persisted with `askedAt`.
- `init`, `update` and `claude setup` gain `--no-typesafe` next to `--typesafe` (src/index.ts).
- `hasTypesafeToken` also finds `TYPESAFE_API_KEY` in the project's untracked `.env`
  (env first, then `.env`; minimal parse of that one key; never logged, never assigned to env).
- The CLI report is one gray line when the plugin is present and the key found; when the key is
  missing it prints the token instructions once and says the gate runs once the key is set.
- `renderTypesafeRule()` shrinks to ≤ 90 tokens: marker, heading, skill, gate, key source.
- `RulebookConfig.integrations.typesafe` comment: on by default since v7.4; `false` = opt-out.

## Impact
- Affected specs: integrations (TypeSafe default-on)
- Affected code: src/cli/commands/typesafe.ts, init.ts, update.ts, claude.ts, src/index.ts,
  src/core/claude/typesafe-integration.ts, src/types.ts
- Breaking change: NO (a stored `enabled:false` is never overridden; `--no-typesafe` opts out)
- User benefit: the Jev gate works out of the box; one flag or one config value turns it off
