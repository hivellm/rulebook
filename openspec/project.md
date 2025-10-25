# Project Context

This file contains the authoritative project context for the Rulebook project.

## Project Overview

**Rulebook** is a TypeScript-based tool for generating and managing project rules and conventions. It provides a structured approach to maintaining code quality standards, documentation requirements, and development workflows across different projects.

## Technology Stack

### Core Technologies
- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 18+
- **Package Manager**: npm
- **Module System**: ES Modules
- **Target**: ES2022

### Development Tools
- **Testing Framework**: Vitest
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Build Tool**: TypeScript Compiler (tsc)
- **Coverage**: Vitest coverage

### Project Structure
```
rulebook/
├── src/
│   ├── core/           # Core business logic
│   ├── cli/            # CLI interface
│   ├── utils/          # Utility functions
│   └── types.ts        # Type definitions
├── tests/              # Test files
├── docs/               # Project documentation
├── templates/          # Rule templates
├── dist/               # Compiled output
└── openspec/           # OpenSpec workflow files
```

## Architecture Patterns

### Core Modules
- **ConfigManager**: Handles configuration loading and validation
- **Generator**: Creates rule files from templates
- **Validator**: Validates rule syntax and structure
- **Detector**: Detects project type and technology stack
- **Merger**: Combines multiple rule sources
- **Watcher**: Monitors file changes for auto-updates
- **Logger**: Centralized logging system
- **OpenSpecManager**: Manages OpenSpec workflow

### Design Principles
- **Modular Design**: Each module has a single responsibility
- **Dependency Injection**: For better testability
- **Error Handling**: Custom error classes with proper typing
- **Configuration**: Centralized config management
- **Type Safety**: Strict TypeScript with no `any` types

## Code Quality Standards

### TypeScript Configuration
- **Strict Mode**: Enabled
- **Target**: ES2022
- **Module**: ESNext with Node16 resolution
- **No Implicit Any**: All types must be explicit
- **Strict Null Checks**: Handle null/undefined explicitly

### Testing Requirements
- **Coverage**: Minimum 95%
- **Framework**: Vitest
- **Location**: `/tests` directory
- **Strategy**: Test-first development
- **Quality**: All tests must pass before commits

### Linting and Formatting
- **ESLint**: TypeScript recommended rules
- **Prettier**: Consistent code formatting
- **Quality Gate**: Must pass with no warnings
- **Auto-fix**: Use `--fix` when possible

## Development Workflow

### Quality Gates (Mandatory)
```bash
# 1. Type check
npm run type-check

# 2. Lint (MUST pass with no warnings)
npm run lint

# 3. Format code
npm run format

# 4. Run all tests (MUST pass 100%)
npm test

# 5. Check coverage (MUST meet threshold)
npm run test:coverage
```

### Feature Development Process
1. **Read Specifications**: Check `/docs/specs/` first
2. **Write Tests**: Create tests before implementation
3. **Implement**: Follow specifications exactly
4. **Quality Checks**: Run all quality gates
5. **Update Documentation**: Update relevant docs

## Documentation Standards

### Allowed Root-Level Files
- `README.md` - Project overview
- `CHANGELOG.md` - Version history
- `AGENTS.md` - AI assistant instructions
- `LICENSE` - Project license
- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Code of conduct
- `SECURITY.md` - Security policy

### Documentation Location Rules
- **ALL other documentation** MUST go in `/docs` directory
- **Architecture**: `/docs/ARCHITECTURE.md`
- **Development Guide**: `/docs/DEVELOPMENT.md`
- **Roadmap**: `/docs/ROADMAP.md`
- **Specifications**: `/docs/specs/`
- **Guides**: `/docs/guides/`

## Dependencies and Constraints

### External Dependencies
- **Node.js**: 18+ required
- **TypeScript**: 5.3+ required
- **Vitest**: Latest stable
- **ESLint**: TypeScript plugin required
- **Prettier**: For code formatting

### Internal Dependencies
- **Core modules**: ConfigManager, Generator, Validator
- **CLI**: Commands, Prompts, Docs
- **Utils**: File system, Rules ignore
- **Templates**: Language-specific rule templates

## Performance Requirements

### Build Performance
- **Type checking**: < 5 seconds
- **Test execution**: < 30 seconds
- **Linting**: < 10 seconds
- **Coverage**: < 60 seconds

### Runtime Performance
- **Rule generation**: < 1 second for typical projects
- **File watching**: Real-time updates
- **Memory usage**: < 100MB for large projects

## Security Considerations

### Input Validation
- **File paths**: Validate and sanitize
- **Template data**: Escape special characters
- **Configuration**: Validate schema

### File System Access
- **Read-only**: Templates and configs
- **Write access**: Only to specified output directories
- **Permissions**: Respect file system permissions

## Error Handling Strategy

### Error Types
- **ValidationError**: Invalid input data
- **ConfigError**: Configuration issues
- **FileSystemError**: File operation failures
- **TemplateError**: Template processing errors

### Error Recovery
- **Graceful degradation**: Continue with partial results
- **User feedback**: Clear error messages
- **Logging**: Detailed error information
- **Recovery**: Automatic retry where appropriate

## Testing Strategy

### Test Categories
- **Unit Tests**: Individual module testing
- **Integration Tests**: Module interaction testing
- **E2E Tests**: Full workflow testing
- **Performance Tests**: Speed and memory usage

### Test Data
- **Fixtures**: Sample project structures
- **Mocks**: External dependencies
- **Snapshots**: Expected output validation

## Deployment and Distribution

### Package Distribution
- **NPM**: Primary distribution method
- **Binary**: Standalone executable option
- **Docker**: Containerized deployment

### Version Management
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Changelog**: Detailed release notes
- **Migration**: Breaking change documentation

## OpenSpec Integration

### Workflow Integration
- **Task Management**: `openspec/tasks.json`
- **Agent Instructions**: `openspec/AGENTS.md`
- **Project Context**: This file
- **Logging**: `openspec/logs/`

### Change Management
- **Proposals**: Standard format required
- **Reviews**: All changes must be reviewed
- **Documentation**: Update relevant docs
- **Testing**: Comprehensive test coverage

---

*This file is managed by the OpenSpec system. Update when project context changes significantly.*
