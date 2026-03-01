# Tasks: Fix PRDGenerator Ignoring specs/*.md

- [x] Read full `generatePRD()` function in `src/core/prd-generator.ts`
- [x] Add `loadSpecCriteria(taskDir)` helper that reads all `specs/**/*.md` files
- [x] Inject spec content into PRD generation context after proposal.md
- [x] Extract SHALL/MUST statements from spec files as acceptance criteria candidates
- [x] Add spec source references in generated story `notes` field
- [x] Handle case where specs/ directory does not exist (no-op, not error)
- [x] Write test: PRD generated with specs/ present includes spec requirements
- [x] Write test: SHALL statements appear as acceptance criteria
- [x] Write test: empty specs/ directory does not error
- [x] Write test: nested specs (specs/module/spec.md) are included
- [x] Run full test suite and fix any regressions
