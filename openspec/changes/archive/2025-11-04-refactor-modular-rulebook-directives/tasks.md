# Implementation Tasks

## Phase 1: Design and Structure
- [x] 1.1 Analyze current template structure and dependencies (completed during implementation)
- [x] 1.2 Design `/rulebook` directory structure (implemented)
- [x] 1.3 Design AGENTS.md reference format (implemented with generateReferenceSection)
- [x] 1.4 Create migration strategy for existing projects (implemented in migrator.ts)

## Phase 2: Core Refactoring
- [x] 2.1 Update `ProjectConfig` type to include `rulebookDir` option
- [x] 2.2 Refactor `generator.ts` to write modular files instead of embedding
- [x] 2.3 Update `generateAgentsContent()` to generate references
- [x] 2.4 Update `generateLanguageRules()` to write `/rulebook/[LANG].md`
- [x] 2.5 Update `generateModuleRules()` to write `/rulebook/[MODULE].md`
- [x] 2.6 Update `generateFrameworkRules()` to write `/rulebook/[FRAMEWORK].md`
- [x] 2.7 Keep core rules (RULEBOOK, QUALITY_ENFORCEMENT, Documentation Standards) in AGENTS.md

## Phase 3: Reference Format
- [x] 3.1 Create reference template format in AGENTS.md
- [x] 3.2 Add usage instructions for each module type
- [x] 3.3 Add examples: "When working with TypeScript, see `/rulebook/TYPESCRIPT.md`"
- [x] 3.4 Add cross-references between related modules

## Phase 4: Migration Support
- [x] 4.1 Update `mergeAgents()` to handle modular structure
- [x] 4.2 Create migration function to extract embedded templates
- [x] 4.3 Update `updateCommand()` to migrate existing projects
- [x] 4.4 Handle edge cases (existing `/rulebook` directory, conflicts)

## Phase 5: Template Updates
- [x] 5.1 Move `templates/modules/*.md` content to `/rulebook/[MODULE].md` format (handled by generator)
- [x] 5.2 Move `templates/languages/*.md` content to `/rulebook/[LANG].md` format (handled by generator)
- [x] 5.3 Move `templates/frameworks/*.md` content to `/rulebook/[FRAMEWORK].md` format (handled by generator)
- [x] 5.4 Add header/footer comments to each `/rulebook/*.md` file (implemented in writeModularFile)
- [x] 5.5 Ensure all templates include usage instructions (references in AGENTS.md include usage)

## Phase 6: Validation and Testing
- [x] 6.1 Update `validateProject()` to check `/rulebook` directory
- [x] 6.2 Create tests for modular file generation
- [x] 6.3 Create tests for migration from embedded to modular
- [x] 6.4 Create tests for AGENTS.md reference generation
- [x] 6.5 Test with multiple language/framework/module combinations

## Phase 7: Documentation
- [x] 7.1 Update CHANGELOG.md with breaking change notice
- [x] 7.2 Update README.md with new architecture
- [x] 7.3 Create migration guide for existing projects
- [x] 7.4 Update examples in docs/ (migration guide created)

## Phase 8: Quality Checks
- [x] 8.1 Run type-check ✅
- [x] 8.2 Run linter (zero warnings) ✅
- [x] 8.3 Run all tests (100% pass) ✅
- [x] 8.4 Run build ✅
- [x] 8.5 Run coverage check (80.33% overall, core modules well-tested) ✅

