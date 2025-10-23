<!-- OPENSPEC:START -->
# OpenSpec Instructions

**CRITICAL**: Use OpenSpec for managing change proposals, specifications, and feature planning.

OpenSpec provides a structured workflow for proposing, reviewing, and implementing changes to the project. Always check for existing specs before implementing features.

## When to Use OpenSpec

Use OpenSpec when the request:

- Mentions planning or proposals (words like "proposal", "spec", "change", "plan")
- Introduces new capabilities or features
- Involves breaking changes or API modifications
- Requires architecture shifts or major refactoring
- Includes significant performance or security work
- Sounds ambiguous and needs clarification before coding

## OpenSpec Workflow

### 1. Check Existing Specs

Before implementing any feature:

```
1. Check /openspec directory for existing proposals
2. Review @/openspec/AGENTS.md for conventions
3. Search for related specs or RFCs
4. Read relevant specifications thoroughly
```

### 2. Create New Proposal

For new features or significant changes:

```
1. Use OpenSpec format for proposal
2. Include rationale, design, alternatives
3. Document breaking changes
4. Specify acceptance criteria
5. Request review from maintainers
```

### 3. Implementation

Follow the approved spec:

```
1. Implement exactly as specified
2. Document any deviations with justification
3. Update spec if design changes during implementation
4. Reference spec in commit messages
5. Mark spec as implemented when complete
```

### 4. Review and Iterate

Continuous improvement:

```
1. Collect feedback during implementation
2. Update spec with learnings
3. Document issues and resolutions
4. Archive completed specs appropriately
```

## Spec Format

Follow the OpenSpec conventions:

```markdown
# [Spec Title]

## Status
[Draft | Under Review | Approved | Implemented | Rejected]

## Summary
Brief description of the proposal.

## Motivation
Why is this change needed?

## Detailed Design
How will this be implemented?

## Alternatives Considered
What other approaches were considered?

## Breaking Changes
Any breaking changes and migration path.

## Acceptance Criteria
How to verify the implementation is complete.
```

## Best Practices

1. **Read Before Implementing**: Always check `/openspec/AGENTS.md` first
2. **Follow Conventions**: Use the specified format and structure
3. **Be Thorough**: Include all relevant details and considerations
4. **Update Actively**: Keep specs current during implementation
5. **Reference Specs**: Link specs in commits, PRs, and documentation

## Integration with Development Workflow

### Before Starting Work

```
1. Check: Does a spec exist for this feature?
2. If yes: Read and understand the complete specification
3. If no: Should this have a spec? (significant features should)
4. If needed: Create proposal and get approval before implementing
```

### During Implementation

```
1. Follow the spec exactly
2. Document deviations immediately
3. Update spec if design changes
4. Add implementation notes to spec
```

### After Completion

```
1. Mark spec as implemented
2. Update with actual implementation details
3. Document any differences from original design
4. Archive or move to appropriate location
```

## Common Patterns

### Pattern 1: New Feature

```
1. Create proposal in /openspec/proposals/
2. Get feedback and approval
3. Implement according to spec
4. Update /docs/specs/ with final design
5. Mark proposal as implemented
```

### Pattern 2: Breaking Change

```
1. Create RFC (Request for Comments)
2. Document migration path
3. Get community/team review
4. Implement with migration guide
5. Update CHANGELOG.md and version docs
```

### Pattern 3: Architecture Change

```
1. Create architecture proposal
2. Include diagrams and detailed design
3. Review with architecture team
4. Implement in phases if needed
5. Update /docs/ARCHITECTURE.md
```

## File Organization

```
/openspec/
├── AGENTS.md          # OpenSpec conventions
├── proposals/         # Active proposals
├── rfcs/              # Requests for comments
├── implemented/       # Completed specs
└── rejected/          # Declined proposals
```

<!-- OPENSPEC:END -->

