## 1. Implementation
- [x] 1.1 Export `DEFAULT_CLAUDE_MODEL = 'opus'` from src/cli/commands/claude.ts and use it as the `--model` fallback
- [x] 1.2 Derive the `rulebook claude --model` help text in src/index.ts from the constant ("default: opus")
- [x] 1.3 Grep src/ (excluding generators) and docs/ for remaining `sonnet` default-model references

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (help text + src/types.ts modelAssignment comments describe the v7.4 routing)
- [x] 2.2 Write tests covering the new behavior (tests/claude-default-model.test.ts)
- [x] 2.3 Run tests and confirm they pass
