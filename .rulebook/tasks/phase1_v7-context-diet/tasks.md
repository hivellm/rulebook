## 1. Implementation
- [ ] 1.1 Rewrite CLAUDE.md generator/template to lean form (≤60 lines, draft 6.1: identity, commands, values, git safety, advisory orchestration line, on-demand rulebook pointers)
- [ ] 1.2 Make lean AGENTS.md (<3 KB index, draft 6.2) the only generation mode; remove fat-mode paths
- [ ] 1.3 Collapse `.claude/rules/` generation to a single optional language rules file (draft 6.3); remove generation of the 18 retired rule files
- [ ] 1.4 Remove duplicated/contradictory directives (F-008) from all remaining templates and specs
- [ ] 1.5 Align generated analysis directives with the numbered-by-theme standard in templates and emitted commands
- [ ] 1.6 Add token-budget fixture test: generated context of a fixture init project ≤2,500 tokens (tiktoken)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
