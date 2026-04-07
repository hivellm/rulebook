# Tasks: F8 — Multi-agent module

## 1. Template
- [ ] 1.1 Create `templates/core/MULTI_AGENT.md` distilling the tml/UzEngine policy

## 2. Detection / generation
- [ ] 2.1 `detector.ts` flags `multi_agent_recommended` when `.claude/agents/` has ≥3 files
- [ ] 2.2 `generator.ts` includes `MULTI_AGENT.md` content (or reference) in AGENTS.md when flag is set OR config has `multi_agent: true`

## 3. Tail (mandatory)
- [ ] 3.1 Update or create documentation covering the implementation
- [ ] 3.2 Write tests covering the new behavior (detection trigger, AGENTS.md inclusion)
- [ ] 3.3 Run tests and confirm they pass
