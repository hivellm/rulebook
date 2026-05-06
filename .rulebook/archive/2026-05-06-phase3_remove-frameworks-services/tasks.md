## 1. Templates
- [x] 1.1 Delete `templates/frameworks/` (17 files)
- [x] 1.2 Delete `templates/services/` (30 files)
- [x] 1.3 Delete `templates/skills/frameworks/` and `templates/skills/services/`

## 2. Types and detector
- [x] 2.1 Remove `FrameworkId`, `FrameworkDetection`, `ServiceId`, `ServiceDetection` from `src/types.ts`
- [x] 2.2 Drop the `frameworks`/`services` fields from `DetectionResult`, `ProjectConfig`, `RulebookConfig`, and `SkillCategory`
- [x] 2.3 Remove `detectFrameworks`, `detectServices`, and the orphaned `findFirstExisting` helper from `src/core/detect/detector.ts`
- [x] 2.4 Update `detectProject()` to no longer aggregate frameworks/services

## 3. Generators, skills, migrator
- [x] 3.1 Remove `generateFrameworkRules` and `generateServiceRules` from `src/core/generators/generator.ts`
- [x] 3.2 Remove `generateFrameworkReference` / `generateServiceReference` and the framework/service sections inside `generateModularAgents`
- [x] 3.3 Drop framework/service auto-detect from `src/core/skills/skills-manager.ts`; trim `CATEGORY_MAPPINGS` and the categories-record literal
- [x] 3.4 Drop framework block extraction from `src/core/migrator.ts`; remove `extractedFrameworks` from the return shape
- [x] 3.5 Remove `frameworks` field from the Gemini extension JSON in `src/core/generators/workflow-generator.ts`

## 4. CLI wiring
- [x] 4.1 Strip framework/service checkboxes + the `FRAMEWORK_LABELS` table from `src/cli/prompts.ts`
- [x] 4.2 Strip framework/service config writes from `src/cli/commands/init.ts` and `src/cli/commands/update.ts`

## 5. Compress CLI + MCP + doctor
- [x] 5.1 Delete `src/cli/commands/compress.ts` and the barrel re-export in `src/cli/commands/index.ts`
- [x] 5.2 Delete `src/core/compress/{compressor,discover,validator}.ts`
- [x] 5.3 Remove the `program.command('compress …')` block from `src/index.ts` and drop the `compressCommand` import
- [x] 5.4 Remove `rulebook_compress` and `rulebook_compress_list` MCP tool registrations from `src/mcp/rulebook-server.ts`
- [x] 5.5 Remove the `checkCompressionBackups` doctor check (and `checkEvalsFreshness`) from `src/core/quality/doctor.ts`

## 6. Eval harness
- [x] 6.1 Delete `evals/` (cli_run.ts, llm_run.ts, measure.ts, report.ts, prompts/, snapshots/, arms.json, README.md, tsconfig.json)
- [x] 6.2 Delete `tests/evals-harness.test.ts`
- [x] 6.3 Strip the `phase0_terse-foundations — eval harness smoke test` describe block from `tests/rulebook-terse-foundations.test.ts`

## 7. Tests cleanup
- [x] 7.1 Delete `tests/observability-detection.test.ts`, `tests/docker-k8s.test.ts`, `tests/compress-*.test.ts`
- [x] 7.2 Strip the `framework detection` and `service detection` describe blocks from `tests/detector.test.ts`
- [x] 7.3 Strip framework-only test cases from `tests/migrator.test.ts`
- [x] 7.4 Strip `frameworks: [...]` / `services: [...]` literals from `tests/generator.test.ts`, `init-command`, `cli-integration`, `backward-compatibility`, `multi-tool-detection`, `mcp-skills`, `skill-commands`, `rulebook-terse-templates-wiring`, `generator-lean`

## 8. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 8.1 Update or create documentation covering the implementation (CHANGELOG.md 5.7.0 entry + README scrub of frameworks/services/compress/evals references; package.json version bump 5.6.0 → 5.7.0)
- [x] 8.2 Write tests covering the new behavior (no new tests needed — change is purely subtractive; surviving 1175 tests verify the trimmed surface still functions)
- [x] 8.3 Run tests and confirm they pass — `npm run type-check` clean, `npm run lint` clean, `npm test` 1175 pass (1 pre-existing unrelated failure in tests/enforce-pre-tool-shell.test.ts verified against clean release/v5.6.0)
