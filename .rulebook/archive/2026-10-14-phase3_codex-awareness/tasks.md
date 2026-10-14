## 1. Implementation
- [x] 1.1 Lean rules block visible to Codex (verify with codex debug prompt-input) — init/update keep a marked `RULEBOOK-CODEX` block (~300 tokens) at the top of AGENTS.override.md; codex-cli 0.162 `codex debug prompt-input "x"` shows it before the user's rules (without it Codex saw only the user's override)
- [x] 1.2 Codex hooks: trust + tool-name documentation or generated Codex-native hooks — documented (README "Codex" section and the block itself): project hooks need Codex trust and match Claude tool names; no Codex-native hooks generated

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs) — README; CHANGELOG bullets handed to the main session
- [x] 2.2 Write tests covering the new behavior — tests/orchestration-mode.test.ts (Codex block: placement, idempotence, CRLF, mode refresh, override clear, AGENTS.md embedding, ≤ 400 tokens)
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
