# OpenSpec Agent Instructions

This file contains the authoritative specifications for AI assistants working on this project using the OpenSpec workflow.

## When to Use OpenSpec

Always consult this file when the request involves:

- **Planning or Proposals**: Words like proposal, spec, change, plan, architecture
- **Major Changes**: New capabilities, breaking changes, architecture shifts, or significant performance/security work
- **Ambiguous Requests**: When you need authoritative specifications before coding

## OpenSpec Workflow

### 1. Change Proposal Process

When creating a change proposal:

1. **Read Project Context**: Always start by reading `openspec/project.md` to understand:
   - Project tech stack and conventions
   - Current architecture and patterns
   - Existing dependencies and constraints

2. **Create Proposal**: Use the standard proposal format:
   ```markdown
   # Proposal: [Feature Name]
   
   ## Problem Statement
   [Clear description of what needs to be solved]
   
   ## Proposed Solution
   [Detailed solution with technical approach]
   
   ## Implementation Plan
   - [ ] Step 1: [Description]
   - [ ] Step 2: [Description]
   - [ ] Step 3: [Description]
   
   ## Dependencies
   - [List any dependencies on other features/tasks]
   
   ## Testing Strategy
   - [How this will be tested]
   - [Coverage requirements]
   
   ## Breaking Changes
   - [List any breaking changes]
   
   ## Timeline
   - Estimated effort: [X hours/days]
   - Priority: [High/Medium/Low]
   ```

3. **Review and Approve**: Proposals must be reviewed before implementation

### 2. Implementation Standards

#### Code Quality Requirements
- **TypeScript**: Use strict mode, proper typing, no `any` types
- **Testing**: 95%+ coverage, tests written first
- **Linting**: Must pass with no warnings
- **Documentation**: JSDoc/TSDoc for all public APIs

#### Project Structure Compliance
- Follow the established project structure
- Use `/docs` directory for all documentation (except root-level allowed files)
- Keep root directory clean with only essential files

#### Quality Gates
Before any commit, run these commands in order:
```bash
npm run type-check
npm run lint
npm run format
npm test
npm run test:coverage
```

### 3. Task Management

#### Task States
- **pending**: Not yet started
- **in_progress**: Currently being worked on
- **completed**: Finished successfully
- **cancelled**: No longer needed

#### Task Dependencies
- Always check dependencies before starting work
- Update task status in `openspec/tasks.json`
- Document any blockers or issues

### 4. Documentation Standards

#### Required Documentation Updates
- Update `/docs/ROADMAP.md` with progress
- Update feature specs if implementation differs
- Document any deviations with justification
- Update CHANGELOG.md for significant changes

#### Documentation Location Rules
- **Root Level**: Only README.md, CHANGELOG.md, AGENTS.md, LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- **All Other Docs**: Must go in `/docs` directory

### 5. Communication Protocol

#### Status Updates
- Provide regular status updates during long tasks
- Report any blockers or issues immediately
- Ask for clarification when requirements are ambiguous

#### Code Reviews
- All code changes must be reviewed
- Explain complex logic and design decisions
- Ensure tests cover edge cases

## Project-Specific Guidelines

### Technology Stack
- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 18+
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Package Manager**: npm
- **Module System**: ES Modules

### Architecture Patterns
- **Modular Design**: Separate concerns into focused modules
- **Dependency Injection**: Use for testability
- **Error Handling**: Custom error classes with proper typing
- **Configuration**: Centralized config management

### Development Workflow
1. **Spec First**: Read specifications before coding
2. **Test First**: Write tests before implementation
3. **Quality Gates**: All checks must pass
4. **Documentation**: Update docs as you go

## Emergency Procedures

### When Things Go Wrong
1. **Stop immediately** if tests fail
2. **Revert changes** if quality gates fail
3. **Document the issue** in task comments
4. **Ask for help** if stuck for more than 30 minutes

### Escalation Path
1. Check project documentation first
2. Review similar implementations
3. Ask for clarification
4. Propose alternative solutions

## Success Metrics

### Code Quality
- 95%+ test coverage
- Zero linting warnings
- All type checks pass
- Documentation up to date

### Process Quality
- Tasks completed on time
- Dependencies properly managed
- Clear communication throughout
- Proper documentation updates

---

*This file is managed by the OpenSpec system. Do not edit manually unless you understand the full impact.*
