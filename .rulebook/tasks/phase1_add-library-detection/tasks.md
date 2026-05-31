## 1. Data model & registry
- [x] 1.1 Add `LibraryId` union and `LibraryDetection` interface to `src/types.ts`
- [x] 1.2 Add optional `libraries?: string[]` to `ProjectConfig` in `src/types.ts`
- [x] 1.3 Create `src/core/detect/library-registry.ts` with the `LibraryDef` shape and an empty exported registry array

## 2. Detection
- [x] 2.1 Implement manifest parsers in `detector.ts` (package.json deps+devDeps, Cargo.toml, pyproject.toml/requirements.txt, go.mod) reading direct dependencies only
- [x] 2.2 Implement `detectLibraries(cwd)` matching manifests against the registry and returning confidence-sorted `LibraryDetection[]`
- [x] 2.3 Wire `detectLibraries` into `detectProject()` and add `libraries` to `DetectionResult`

## 3. Library catalog (curated templates)
- [x] 3.1 Populate registry entries for TS/JS libs: react, next, vue, svelte, angular, tailwind, heroui, radix, shadcn, prisma, drizzle, trpc, zod, express, nestjs, vitest, jest
- [x] 3.2 Write `templates/libraries/typescript/<LIB>.md` for each TS/JS entry (sentinel + frontmatter format)
- [x] 3.3 Populate registry entries and templates for Python libs: django, fastapi, flask, sqlalchemy, pydantic, pytest
- [x] 3.4 Populate registry entries and templates for Rust libs: axum, actix, tokio, serde, sqlx
- [x] 3.5 Populate registry entries and templates for Go libs: gin, echo, gorm

## 4. Generation
- [x] 4.1 Add `generateLibraryRules(library)` to `generator.ts` resolving `templates/libraries/<lang>/<LIB>.md`
- [x] 4.2 Add the library loop after the language loop: write `.rulebook/specs/<LIB>.md` and append references to AGENTS.md
- [x] 4.3 Emit path-scoped `.claude/rules/<lib>.md` in `rules-generator.ts` for libraries that define `rulePaths`

## 5. Selection / UX
- [x] 5.1 Add interactive language+library selection (`promptLanguagesAndLibraries`) in `initCommand`, gated on TTY and not `--yes` (non-interactive runs keep auto-from-detection)
- [x] 5.2 Add the language checklist fallback when `detection.languages.length === 0` (fixes the empty-folder dead-end)
- [x] 5.3 Add the library step in `prompts.ts`: pre-checked confirm/edit when detected; full checklist grouped by language when none detected

## 6. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 6.1 Update or create documentation covering the implementation
- [x] 6.2 Write tests covering the new behavior
- [x] 6.3 Run tests and confirm they pass
