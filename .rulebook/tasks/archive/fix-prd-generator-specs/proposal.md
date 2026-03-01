# Proposal: Fix PRDGenerator Ignoring specs/*.md Context

## Problem

`PRDGenerator` in `src/core/prd-generator.ts` generates PRDs from task proposals but ignores `specs/<module>/spec.md` files present in the task directory. These spec files contain critical technical requirements (SHALL/MUST requirements, interface definitions, API contracts) that should inform PRD user story generation.

The result is PRDs that miss important technical context, producing vague user stories without concrete acceptance criteria derived from the specs.

## Root Cause

`generatePRD()` only reads `proposal.md` and optionally `design.md`. It does not traverse the `specs/` subdirectory to include module spec content.

## Impact

- Ralph user stories lack technical precision
- Acceptance criteria are too vague to validate programmatically
- Spec requirements are silently ignored
- Technical debt accumulates as specs diverge from PRD stories

## Proposed Fix

In `generatePRD()`:
1. Traverse `specs/**/*.md` in the task directory
2. Concatenate spec content into the generation context
3. Extract SHALL/MUST statements as acceptance criteria candidates
4. Reference spec sources in generated story notes

## Files to Modify

- `src/core/prd-generator.ts` — read specs/*.md when building generation context
- `tests/prd-generator.test.ts` — add test with spec files present
