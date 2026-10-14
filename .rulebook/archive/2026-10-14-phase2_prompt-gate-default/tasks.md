## 1. Implementation
- [x] 1.1 Operator decision Q2 recorded
- [x] 1.2 Default flipped; init/update install the hook only when enabled
- [x] 1.3 Always-on text: drop "Gate first" and the manual fallback

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)

## Results
- Q2 (operator decision): the prompt hook is OFF by default. `gate.promptHook.enabled` must be `true` to install and run it; `rulebook_gate` stays as an on-demand MCP tool.
- init/update/claude install the UserPromptSubmit entry only when the flag is true; on every sync a rulebook-owned entry (v7.4 `jev-gate.sh prompt` or v7.5 `hook-main.js prompt-gate`) is removed otherwise.
- Always-on text: the `.claude/rules/typesafe.md` rule now reads "`rulebook_gate` on demand; opt-in prompt hook: `gate.promptHook.enabled`" (90 tokens, budget 90). "Gate first" in templates/core/claude-md.md and templates/core/orchestration.md is removed by the phase2_orchestration-by-judgment lane (split by the coordinator).
- CHANGELOG entry: written by the release step; docs/MCP_SERVER.md and README.md updated here.
