# Tasks: Fix PRDGenerator Ignoring specs/*.md

- [ ] Read full `generatePRD()` function in `src/core/prd-generator.ts`
- [ ] Add `loadSpecFiles(taskDir)` helper that reads all `specs/**/*.md` files
- [ ] Inject spec content into PRD generation context after proposal.md
- [ ] Extract SHALL/MUST statements from spec files as acceptance criteria candidates
- [ ] Add spec source references in generated story `notes` field
- [ ] Handle case where specs/ directory does not exist (no-op, not error)
- [ ] Write test: PRD generated with specs/ present includes spec requirements
- [ ] Write test: SHALL statements appear as acceptance criteria
- [ ] Write test: empty specs/ directory does not error
- [ ] Write test: nested specs (specs/module/spec.md) are included
- [ ] Run full test suite and fix any regressions
