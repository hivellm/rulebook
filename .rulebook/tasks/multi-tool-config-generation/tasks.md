# Tasks: Multi-Tool Config Generation

- [ ] Add IDE detection types to `src/types.ts` (GeminiCLI, ContinueDev, Windsurf, GitHubCopilot)
- [ ] Implement `detectGeminiCLI(projectRoot)` — check `GEMINI.md` or `gemini` in cliTools
- [ ] Implement `detectContinueDev(projectRoot)` — check `.continue/` directory
- [ ] Implement `detectWindsurf(projectRoot)` — check `.windsurfrules`
- [ ] Implement `detectGitHubCopilot(projectRoot)` — check `.github/copilot-instructions.md`
- [ ] Write `templates/ides/gemini.md` template for `GEMINI.md`
- [ ] Write `templates/ides/continue-rules.md` template for `.continue/rules/`
- [ ] Write `templates/ides/windsurf-rules.md` template for `.windsurfrules`
- [ ] Write `templates/ides/copilot-instructions.md` template
- [ ] Implement `generateGeminiMd(projectRoot, detection)` generator
- [ ] Implement `generateContinueRules(projectRoot, detection)` generator
- [ ] Implement `generateWindsurfRules(projectRoot, detection)` generator
- [ ] Implement `generateCopilotInstructions(projectRoot, detection)` generator
- [ ] Wire all generators into `src/core/generator.ts` main flow
- [ ] Show generated files in init/update CLI output
- [ ] Write tests: each tool detected and config generated correctly
- [ ] Write tests: no tools detected → no extra files generated
- [ ] Run full test suite
