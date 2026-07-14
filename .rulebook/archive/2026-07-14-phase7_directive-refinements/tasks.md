## 1. Implementation
- [x] 1.1 Rewrite prohibitions rule 6 as dependency semantics; propagate to rulebook.md, agents-lean.md, claude-md.md, rulebook-task-apply.md (#18)
- [x] 1.2 Split git rules by blast radius; allow agent-branch workflows + worktrees (#20) — prohibitions, git-workflow, claude-md; value 5 no longer bans revert of own commits
- [x] 1.3 Neutral mcp-tool-reference wording — cheapest surface, no MCP-over-shell mandate (#22)
- [x] 1.4 Tiered quality gate wording in claude-md, agents-lean, quality, git-workflow (#23) — commit: typecheck+lint+affected tests; push/PR/archive: full suite
- [x] 1.5 Extend P0 fixture test: no total-order mandate, no branch-switching ban in generated context

## 2. Tail (mandatory — enforced by rulebook)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG entry; repo self-applied (CLAUDE.md/AGENTS.md/specs/mcp-ref regenerated)
- [x] 2.2 Write tests covering the new behavior — P0 test extended with 4 new assertions
- [x] 2.3 Run tests and confirm they pass — suite green: 845 tests
