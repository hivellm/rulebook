## 1. Implementation
- [x] 1.1 Rewrite CLAUDE.md generator/template to lean form (≤60 lines, draft 6.1: identity, commands, values, git safety, advisory orchestration line, on-demand rulebook pointers) — templates/core/CLAUDE_MD_v2.md, 43 lines / ~540 tok
- [x] 1.2 Make lean AGENTS.md (<3 KB index, draft 6.2) the only generation mode; remove fat-mode paths — templates/core/AGENTS_LEAN.md rewritten (~2.3 KB / ~670 tok); fat mode was already delegated to lean in generateFullAgents
- [x] 1.3 Collapse `.claude/rules/` generation to a single optional language rules file (draft 6.3); remove generation of the 18 retired rule files — rules-generator.ts (RETIRED_ALWAYS_ON_RULES), init.ts + update.ts canonical-rule install removed; only path-scoped language/library rules remain
- [x] 1.4 Remove duplicated/contradictory directives (F-008) from all remaining templates and specs — sequential-editing prohibition removed from TIER1_PROHIBITIONS.md; karpathy/delegation/task-workflow duplicates eliminated by the 1.1/1.2 rewrites
- [x] 1.5 Align generated analysis directives with the numbered-by-theme standard in templates and emitted commands — single source templates/skills/dev/analysis/SKILL.md already aligned; lean CLAUDE.md/AGENTS.md reference the standard
- [x] 1.6 Add token-budget fixture test: generated context of a fixture init project ≤2,500 tokens (tiktoken) — tests/context-budget.test.ts guards file-based share ≤1,600 tok (900 reserved for MCP schemas, phase3)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG Unreleased section + impact ledger row (−56%) in docs/analysis/v7-performance/05-budget-and-metrics.md
- [x] 2.2 Write tests covering the new behavior — tests/context-budget.test.ts (3 tests); rules-generator + claude-md-generator + generator tests updated to v7 behavior
- [x] 2.3 Run tests and confirm they pass — full suite green: 59 files, 994 tests passed
