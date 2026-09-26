# Proposal: phase1_typesafe-client-and-gate

## Why
The main session guesses the kind of each operator prompt, whether it needs a
task, which model and subagent to use, and whether it is risky. Jev (TypeSafe's
System One model) can answer those judgments as typed probabilities in one call.
v7.4 adds an entry gate that asks Jev once per operator prompt and hands back a
routing the session acts on, degrading to the CLAUDE.md rules when Jev is not
reachable or has no key.

## What Changes
- `src/core/typesafe/client.ts`: plain-fetch System One client (Bearer auth,
  10 s per-attempt timeout, overall deadline, retry on 429/529/network with
  exponential backoff + jitter, max 2 retries, typed errors, key redaction) and
  `resolveTypesafeKey` (env first, then the one key from `<root>/.env`).
- `src/core/typesafe/gate.ts`: state builder with size caps and trimming order,
  the 11-question set, thresholds, post-rules, `routing` derivation,
  `instruction` text, `RULEBOOK_GATE=off`, once-per-process key instructions,
  and the optional `.rulebook/logs/gate.jsonl` decision log (`features.logging`).
- MCP tool `rulebook_gate` (6th tool) with an 8.5 s deadline inside the 10 s
  handler guard; schema budget raised 4400 → 4900 bytes.
- CLI `rulebook gate "<prompt>" [--notes] [--json]` and `rulebook gate --check [--strict]`.
- Docs: `rulebook_gate` section in `docs/MCP_SERVER.md`.

## Impact
- Affected specs: gate (new)
- Affected code: src/core/typesafe/*, src/mcp/tools/v7-tools.ts, src/cli/commands/gate.ts, src/index.ts
- Breaking change: NO (the gate is advisory; `RULEBOOK_GATE=off` disables it)
- User benefit: routing decisions (kind, task, model, agent, skill, parallelism, risk) come from one cheap Jev call instead of guesswork
