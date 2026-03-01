# Tasks: Multi-Tool Config Generation

- [x] Add IDE detection types to `src/types.ts` (GeminiCLI, ContinueDev, Windsurf, GitHubCopilot)
- [x] Implement `detectGeminiCLI(projectRoot)` — check `GEMINI.md` or `gemini` in cliTools
- [x] Implement `detectContinueDev(projectRoot)` — check `.continue/` directory
- [x] Implement `detectWindsurf(projectRoot)` — check `.windsurfrules`
- [x] Implement `detectGitHubCopilot(projectRoot)` — check `.github/copilot-instructions.md`
- [x] Write `templates/ides/GEMINI_RULES.md` template for `GEMINI.md`
- [x] Write `templates/ides/CONTINUE_RULES.md` template for `.continue/rules/`
- [x] Write `templates/ides/WINDSURF_RULES.md` template for `.windsurfrules`
- [x] Write `templates/ides/COPILOT_INSTRUCTIONS.md` template
- [x] Implement `generateGeminiMd(projectRoot)` generator
- [x] Implement `generateContinueRules(projectRoot)` generator
- [x] Implement `generateWindsurfRules(projectRoot)` generator
- [x] Implement `generateCopilotInstructions(projectRoot)` generator
- [x] Wire all generators into `src/core/generator.ts` main flow
- [x] Show generated files in init/update CLI output
- [x] Write tests: each tool detected and config generated correctly
- [x] Write tests: no tools detected → no extra files generated
- [x] Run full test suite
