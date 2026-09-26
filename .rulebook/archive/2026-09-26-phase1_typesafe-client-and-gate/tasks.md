## 1. Implementation
- [x] 1.1 System One client (`src/core/typesafe/client.ts`): fetch, Bearer, timeout/deadline, retry + backoff, typed errors, redaction, `resolveTypesafeKey`
- [x] 1.2 Gate core (`src/core/typesafe/gate.ts`): state builder + caps/trimming, question set, thresholds + post-rules, routing, instruction, off switch, key instructions once, decision log
- [x] 1.3 MCP tool `rulebook_gate` in `src/mcp/tools/v7-tools.ts` (8.5 s deadline)
- [x] 1.4 CLI `rulebook gate` (`src/cli/commands/gate.ts` + registration in `src/index.ts`), incl. `--json`, `--check`, `--strict`
- [x] 1.5 Raise `MCP_SCHEMA_BYTES_BUDGET` to 4900 in `tests/v7-budgets.test.ts`

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (`docs/MCP_SERVER.md` `rulebook_gate` section)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass
