# Proposal: Library/framework detection with lean rule generation and empty-folder selection

## Why

Rulebook today detects only the project **language** (TypeScript, Python, Rust, …) and
emits a generic per-language rule block. It does not know which **libraries/frameworks**
a project actually uses (Prisma, Drizzle, React, Tailwind, HeroUI, Radix, Django,
FastAPI, axum, …), so generated guidance is broad instead of focused — the opposite of
"lean, only what you need".

Two concrete gaps:

1. **No library intelligence.** A React + Tailwind + Prisma app gets the same generic
   `TYPESCRIPT.md` as a bare Node script. There is no `package.json`/manifest dependency
   parsing for frameworks (only `dependency-checker.ts`, used for audits).
2. **Empty project blocks the user.** `initCommand()` (`src/cli/commands/init.ts:140`)
   builds the config directly from `detection.languages.map(...)` and never calls the
   existing `promptProjectConfig()` / `promptSimplifiedConfig()`. When detection returns
   zero languages (empty folder), the user ends up with `languages: []` and **cannot
   select anything** — even though the selection prompts already exist and handle the
   empty case correctly.

## What Changes

- **New `libraries` dimension** in `ProjectConfig`, parallel to `languages` and `modules`
  (kept separate — `modules` are MCP/integrations, semantically distinct from app libs).
- **Data-driven library registry** (`src/core/detect/library-registry.ts`): each entry
  maps a library to its detection signals (npm/cargo/pip/gomod package names, marker
  files), its owning language (for prompt grouping), its template path, and optional
  path-scoped rule globs.
- **`detectLibraries(cwd)`** in `detector.ts`: parses `package.json` (direct deps +
  devDeps only), `Cargo.toml`, `pyproject.toml`/`requirements.txt`, `go.mod`; matches the
  registry; returns confidence-sorted `LibraryDetection[]`. Wired into `detectProject()`.
- **Curated lean templates** under `templates/libraries/<lang>/<LIB>.md` (sentinel +
  frontmatter, same format as existing language/module templates).
- **Generator loop** (`generator.ts`): `generateLibraryRules()` writes
  `.rulebook/specs/<LIB>.md` and adds references to `AGENTS.md`, after the language loop.
  Libraries with clear file globs also emit `.claude/rules/<lib>.md`.
- **Selection/UX fix**: `initCommand()` routes through the existing prompt in interactive
  mode. Empty languages → language checklist (fixes the bug). Detected libraries →
  pre-checked checkbox, confirm/edit. Empty folder → full library checklist grouped by
  language. `--yes` keeps current auto-from-detection behavior.
- **Leanness**: additive-targeted — a library spec is emitted only when detected/selected;
  nothing generic-and-unused is generated. (Trimming base language templates is out of
  scope for this task.)

## Impact

- Affected specs: `detect`, `generators`, `cli`
- Affected code: `src/types.ts`, `src/core/detect/detector.ts`,
  `src/core/detect/library-registry.ts` (new), `src/core/generators/generator.ts`,
  `src/core/generators/rules-generator.ts`, `src/cli/commands/init.ts`,
  `src/cli/prompts.ts`, `templates/libraries/**` (new)
- Breaking change: NO (additive — `libraries` is optional; existing projects regenerate
  identically when no libraries are detected/selected)
- User benefit: generated rules are lean and stack-aware, and `init` no longer dead-ends
  on an empty project — the user can always select languages and libraries manually.
