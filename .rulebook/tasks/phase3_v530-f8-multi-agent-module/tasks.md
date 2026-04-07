# Tasks: F8 — Multi-agent module

## 1. Template
- [x] 1.1 `templates/core/MULTI_AGENT.md` already exists (74 lines, shipped pre-v5.3.0)

## 2. Detection / generation
- [x] 2.1 `multiAgent.enabled` config flag added to `RulebookConfig` in `src/types.ts` (part of F-NEW-1)
- [x] 2.2 When `multiAgent.enabled`, the team enforcement hook is wired and `MULTI_AGENT.md` content is available via AGENTS.md (existing generator includes it)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: template is self-documenting
- [x] 3.2 Tests: covered by existing generator tests + F-NEW-1 settings manager tests
- [x] 3.3 Full suite passing
