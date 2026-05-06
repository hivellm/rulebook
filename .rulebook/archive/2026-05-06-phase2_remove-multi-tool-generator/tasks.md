## 1. Implementation (hybrid — original audit was wrong)
- [x] 1.1 Investigate `multi-tool-generator.ts` — confirmed it's a real wired feature for 4 IDEs (Gemini/Continue/Windsurf/Copilot), not a stub generator
- [x] 1.2 Keep `src/core/ide/multi-tool-generator.ts` and its 4 active templates
- [x] 1.3 Delete 8 orphan IDE reference templates: JETBRAINS_AI, REPLIT, TABNINE, ZED, VSCODE, CURSOR, COPILOT, WINDSURF
- [x] 1.4 Note in CHANGELOG.md (5.6.0) that the multi-tool generator stays

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update documentation covering the implementation (CHANGELOG 5.6.0)
- [x] 2.2 Write tests covering the new behavior — N/A; existing 50+ tests in `multi-tool-detection.test.ts` confirm active integrations still work
- [x] 2.3 Run tests and confirm they pass
