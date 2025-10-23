<!-- RULEBOOK:START -->
# Rulebook Project Rules

This project follows the standards it generates for other projects.

## Documentation Standards

**CRITICAL**: Minimize Markdown files. Keep documentation organized.

### Allowed Root-Level Documentation
Only these files are allowed in the project root:
- ✅ `README.md` - Project overview and quick start
- ✅ `CHANGELOG.md` - Version history and release notes
- ✅ `AGENTS.md` - This file (AI assistant instructions)
- ✅ `LICENSE` - Project license
- ✅ `CONTRIBUTING.md` - Contribution guidelines
- ✅ `CODE_OF_CONDUCT.md` - Code of conduct
- ✅ `SECURITY.md` - Security policy

### All Other Documentation
**ALL other documentation MUST go in `/docs` directory**:
- `/docs/ROADMAP.md` - Project roadmap
- `/docs/specs/` - Component specifications
- `/docs/guides/` - Developer guides
- `/docs/examples/` - Usage examples

## Code Quality

### TypeScript Standards

- **Version**: TypeScript 5.3+
- **Strict Mode**: Enabled
- **Target**: ES2022
- **Module**: ESNext

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order:

```bash
# 1. Type check
npm run type-check

# 2. Lint (MUST pass with no warnings)
npm run lint

# 3. Format code
npm run format

# 4. Run all tests (MUST pass 100%)
npm test

# 5. Check coverage (MUST be >95%)
npm run test:coverage
```

**If ANY of these fail, you MUST fix the issues before committing.**

## Testing Requirements

**CRITICAL**: All features must have comprehensive tests.

- **Minimum Coverage**: 95%
- **Test Location**: `/tests` directory in project root
- **Test Execution**: 100% of tests MUST pass before moving to next task
- **Test Framework**: Vitest

## Feature Development Workflow

**CRITICAL**: Follow this workflow for all feature development.

1. **Check Specifications First**:
   - Read `/docs/specs/` for feature specifications
   - Review `/docs/ROADMAP.md` for implementation timeline

2. **Implement with Tests**:
   - Write tests in `/tests` directory first
   - Implement feature following specifications
   - Ensure tests pass and meet coverage threshold

3. **Quality Checks**:
   - Run type checker: `npm run type-check`
   - Run linter: `npm run lint`
   - Run formatter: `npm run format`
   - Run all tests: `npm test`
   - Verify coverage: `npm run test:coverage`

4. **Update Documentation**:
   - Update `/docs/ROADMAP.md` progress
   - Update feature specs if implementation differs
   - Update CHANGELOG.md with changes

## Dependency Management

**CRITICAL**: Keep dependencies up to date.

- Use exact versions for stability
- Check npm registry for latest versions
- Review changelogs before updating
- Update CHANGELOG.md when adding/updating dependencies

## Project Structure

```
rulebook/
├── package.json        # Package manifest
├── tsconfig.json       # TypeScript config
├── vitest.config.ts    # Test config
├── src/
│   ├── index.ts        # CLI entry point
│   ├── cli/            # CLI prompts and commands
│   ├── core/           # Core logic (detector, generator, merger)
│   ├── templates/      # Template files
│   └── utils/          # Utilities
├── tests/              # Test files
├── templates/          # Template files (published)
│   ├── languages/      # Language templates
│   ├── modules/        # Module templates
│   ├── ides/           # IDE templates (future)
│   └── workflows/      # GitHub Actions workflows
├── dist/               # Compiled output (gitignored)
└── docs/               # Project documentation
```

## NPX Compatibility

- Main entry point: `dist/index.js`
- Must have shebang: `#!/usr/bin/env node`
- Bin configuration in package.json
- Templates must be included in npm package

<!-- RULEBOOK:END -->

