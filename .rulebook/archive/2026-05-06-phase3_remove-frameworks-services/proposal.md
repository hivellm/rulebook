# Proposal: phase3_remove-frameworks-services

## Why

Framework templates (17), service templates (30), the `rulebook compress`
CLI command + `src/core/compress/`, and the `evals/` harness all carry
maintenance cost out of proportion to their use. The user (project owner)
reports zero personal use of frameworks/services and no observed downstream
consumption either; compress + evals were experimental tooling that never
graduated past their authoring sessions. Removing them shrinks the surface
area, the test count, and the documentation that has to stay accurate.

## What Changes

### Templates removed
- `templates/frameworks/` (17 files): NestJS, Spring, Laravel, Angular,
  React, Vue, Nuxt, Next.js, Django, Flask, Rails, Symfony, Zend, jQuery,
  React Native, Flutter, Electron.
- `templates/services/` (30 files): all DBs, caches, queues, object
  stores, observability stacks (Datadog, Sentry, OpenTelemetry, Pino,
  Winston, Prometheus).
- `templates/skills/frameworks/` and `templates/skills/services/`.

### Source removed
- Detector: `detectFrameworks`, `detectServices`, the now-unused
  `findFirstExisting` helper. Types: `FrameworkId`, `FrameworkDetection`,
  `ServiceId`, `ServiceDetection`. Removed those fields from
  `DetectionResult`, `ProjectConfig`, `RulebookConfig`, `SkillCategory`.
- Generators: `generateFrameworkRules`, `generateServiceRules`,
  `generateFrameworkReference`, `generateServiceReference`. Stripped
  framework/service sections from `generateModularAgents`.
- Skills manager: dropped the framework + service auto-detect lanes,
  trimmed `CATEGORY_MAPPINGS` and the categories-record initialiser.
- Migrator: dropped framework block extraction. `extractedFrameworks`
  removed from the public return shape.
- Workflow generator: dropped `frameworks` from the Gemini extension JSON.
- CLI: `prompts.ts` no longer asks for frameworks/services. `init.ts`
  and `update.ts` no longer touch those config fields.
- `rulebook compress` CLI command, `src/cli/commands/compress.ts`,
  `src/core/compress/{compressor,discover,validator}.ts`, MCP tools
  `rulebook_compress` and `rulebook_compress_list`, and the
  `checkCompressionBackups` doctor check.
- Eval harness: `evals/` directory (cli_run, llm_run, measure, report,
  prompts, snapshots, arms.json, README, tsconfig), the
  `checkEvalsFreshness` doctor check.

### Tests
- Deleted: `tests/observability-detection.test.ts`,
  `tests/docker-k8s.test.ts`, `tests/evals-harness.test.ts`,
  `tests/compress-{compressor,discover,validator}.test.ts`.
- Stripped framework/service-only assertions from: `migrator.test.ts`,
  `detector.test.ts` (framework detection + service detection blocks),
  `generator.test.ts`, `init-command.test.ts`, `cli-integration.test.ts`,
  `backward-compatibility.test.ts`, `multi-tool-detection.test.ts`,
  `mcp-skills.test.ts`, `skill-commands.test.ts`,
  `rulebook-terse-templates-wiring.test.ts`, `generator-lean.test.ts`,
  `rulebook-terse-foundations.test.ts` (eval harness smoke tests).

### Dependencies / version
- Bumped to v5.7.0 (this is a breaking change for any user opted into
  the framework/service surface; for almost all users it is a no-op
  because the surface had no downstream readers).

## Impact

- Affected specs: none (no spec referenced the removed surface as
  a hard requirement).
- Affected code: ~5K LOC removed across `src/` and `tests/`. ~50
  template files removed.
- Breaking change: **YES** — `rulebook compress`, framework/service
  CLI prompts, and `rulebook_compress*` MCP tools no longer exist.
  Migration is automatic on `rulebook update` (the keys are simply
  ignored if present in `.rulebook/rulebook.json`).
- User benefit: smaller install, smaller `npm test`, fewer obsolete
  surfaces in the README, simpler mental model.
