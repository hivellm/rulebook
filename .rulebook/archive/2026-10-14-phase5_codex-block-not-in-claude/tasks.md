## 1. Implementation
- [x] 1.1 Find a placement Codex reads and Claude Code does not load; verify both sides (one HTML comment: `codex debug prompt-input` shows it raw; a real `claude -p` session's injected AGENTS.override.md dropped it, 309 -> 42 tokens)
- [x] 1.2 Generator and update move the block there; remove it from AGENTS.override.md (it stays in the override, as one comment; init/update rewrite a v7.5.0 block in place)
- [x] 1.3 Context-budget test drops back by ~290 tokens (1,448/1,423 -> 1,192/1,178; budget 1600 -> 1320)

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (README, Codex section)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass
