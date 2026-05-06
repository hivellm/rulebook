# Proposal: phase1_perf-hook-terse-single-node

Source: hivellm/rulebook#15

## Why

The UserPromptSubmit hook `templates/hooks/terse-mode-tracker.sh` invokes
`node -e ...` multiple times per turn (stdin parse, project config read, user
config read, anchor emit). On Windows each `node` cold-start is ~80 ms, which
adds up to **~633 ms per user prompt**. This runs on every user turn, even
when the user is not interacting with terse mode at all.

Two compounding problems:

1. The hot path always parses stdin via `node`, even when the prompt contains
   no terse-related token at all.
2. `resolve_default_mode` re-reads project + user config via separate `node`
   processes on every turn instead of caching the parsed result.

## What Changes

- Add a fast-path bash check at the top of the script: if the prompt is empty
  or contains none of the trigger substrings (`/rulebook-terse`, `terse mode`,
  `be terse`, `stop terse`, `disable terse`, `normal mode`, `less tokens`),
  skip stdin parse and only emit the attention anchor for the active mode (no
  state change possible without a trigger).
- Consolidate stdin parsing + config reads into **a single `node` invocation**
  that returns one JSON blob with `prompt`, `cwd`, and the resolved
  `default_mode`. Replace the three separate `node -e` calls with bash field
  extraction from that blob.
- Preserve the existing `safe_write_flag` / `read_flag` symlink-safety and
  size-cap behavior — only the JSON parsing path is consolidated.
- Mirror the change in `.claude/hooks/terse-mode-tracker.sh`.

## Impact

- Affected specs: `RULEBOOK_TERSE.md` (no behavior change; performance note added).
- Affected code:
  - `templates/hooks/terse-mode-tracker.sh`
  - `.claude/hooks/terse-mode-tracker.sh`
- Breaking change: NO.
- User benefit: ~500 ms saved per user prompt (~80 % reduction on this hook).
