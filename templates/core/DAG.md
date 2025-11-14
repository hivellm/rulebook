<!-- DAG:START -->
# Dependency Architecture Guidelines (DAG)

**CRITICAL**: Maintain a clean dependency graph (DAG) to prevent circular dependencies and ensure maintainable architecture.

## Core Principles

### No Circular Dependencies
- **NEVER** create circular dependencies between components
- **ALWAYS** ensure dependencies form a Directed Acyclic Graph (DAG)
- **ALWAYS** validate dependency structure before committing

### Layer Separation
- **ALWAYS** maintain clear layer boundaries
- **ALWAYS** ensure higher layers depend only on lower layers
- **NEVER** allow lower layers to depend on higher layers

### Interface Boundaries
- **ALWAYS** use interfaces for cross-component communication
- **ALWAYS** define clear contracts between components
- **NEVER** create tight coupling between components

## Dependency Rules

### Layer Architecture

**Layer 1: Foundation**
- Utils, helpers, utilities
- Type definitions
- Configuration management
- Base constants and enums

**Layer 2: Core**
- Core business logic
- Data models and schemas
- Base services and repositories
- Domain entities

**Layer 3: Features**
- Feature implementations
- Business logic
- API endpoints
- Service orchestration

**Layer 4: Presentation**
- UI components
- CLI interfaces
- API controllers
- View models

### Dependency Flow

```
Foundation → Core → Features → Presentation
```

**Rules:**
- ✅ Foundation can depend on nothing (or external libraries only)
- ✅ Core can depend on Foundation
- ✅ Features can depend on Core and Foundation
- ✅ Presentation can depend on Features, Core, and Foundation
- ❌ Foundation CANNOT depend on Core, Features, or Presentation
- ❌ Core CANNOT depend on Features or Presentation
- ❌ Features CANNOT depend on Presentation

## Component Graph Structure

### Example Valid DAG

```
Core
  ├── Utils
  ├── Types
  └── Config

Features
  ├── Feature A
  │   └── Core
  └── Feature B
      ├── Core
      └── Feature A

Presentation
  ├── CLI
  │   └── Features
  └── API
      └── Features
```

### Invalid Patterns (Circular Dependencies)

```
❌ Feature A → Feature B → Feature A
❌ Core → Feature → Core
❌ Utils → Core → Utils
```

## Verification

### Before Committing

**MANDATORY**: Verify dependency structure:

```bash
# Check for circular dependencies
# Add your dependency check command here
# Examples:
# - TypeScript: tsc --noEmit (catches import cycles)
# - Rust: cargo check (catches circular dependencies)
# - Python: pylint --disable=all --enable=import-error
# - Go: go vet ./...
```

### Dependency Analysis Tools

**TypeScript/JavaScript:**
```bash
# Use madge to detect circular dependencies
npx madge --circular src/

# Use dependency-cruiser
npx dependency-cruiser --validate src/
```

**Rust:**
```bash
# Cargo automatically detects circular dependencies
cargo check
```

**Python:**
```bash
# Use vulture or pylint
pylint --disable=all --enable=import-error src/
```

**Go:**
```bash
# Use go vet
go vet ./...
```

## Best Practices

### DO's ✅

- **ALWAYS** maintain clear layer boundaries
- **ALWAYS** validate dependencies before committing
- **ALWAYS** use interfaces for cross-layer communication
- **ALWAYS** document component dependencies
- **ALWAYS** refactor when circular dependencies are detected
- **ALWAYS** keep dependency graph shallow (avoid deep nesting)

### DON'Ts ❌

- **NEVER** create circular dependencies
- **NEVER** allow lower layers to depend on higher layers
- **NEVER** create tight coupling between components
- **NEVER** skip dependency validation
- **NEVER** mix concerns across layers
- **NEVER** create bidirectional dependencies

## Dependency Documentation

### Documenting Dependencies

**In code:**
```typescript
// Component: UserService
// Dependencies:
//   - UserRepository (Core layer)
//   - Logger (Foundation layer)
//   - Config (Foundation layer)
// Does NOT depend on:
//   - UserController (Presentation layer)
//   - UserAPI (Presentation layer)
```

**In documentation:**
- Maintain `docs/DAG.md` with component dependency graph
- Update when adding new components
- Include dependency direction and purpose

## Refactoring Circular Dependencies

### When Circular Dependency is Detected

1. **Identify the cycle**: Map the dependency chain
2. **Find common dependency**: Extract shared functionality
3. **Introduce interface**: Use dependency inversion
4. **Restructure layers**: Move components to appropriate layer
5. **Validate fix**: Run dependency check again

### Example Refactoring

**Before (Circular):**
```
Feature A → Feature B → Feature A
```

**After (Fixed):**
```
Core
  └── SharedService

Feature A → Core
Feature B → Core
```

## Integration with AGENT_AUTOMATION

**CRITICAL**: Include dependency validation in AGENT_AUTOMATION workflow:

```bash
# Step 1.5: Dependency Validation (before implementation)
# Check for circular dependencies
npm run check-deps  # or equivalent for your language

# If circular dependencies detected:
# ❌ STOP - Fix architecture first
# ✅ Refactor to remove cycles
# ✅ Re-validate before proceeding
```

## Language-Specific Guidelines

### TypeScript/JavaScript
- Use `madge` or `dependency-cruiser` for validation
- Configure ESLint rules for import ordering
- Use path aliases to enforce layer structure

### Rust
- Cargo automatically detects circular dependencies
- Use `cargo tree` to visualize dependencies
- Organize modules to reflect layer structure

### Python
- Use `pylint` or `vulture` for import analysis
- Organize packages to reflect layer structure
- Use `__init__.py` to control exports

### Go
- Use `go vet` for dependency validation
- Organize packages in directories reflecting layers
- Use interfaces to decouple components

## Examples

### Good Architecture ✅

```
src/
├── foundation/
│   ├── utils/
│   ├── types/
│   └── config/
├── core/
│   ├── models/
│   ├── services/
│   └── repositories/
├── features/
│   ├── auth/
│   │   └── (depends on core, foundation)
│   └── payments/
│       └── (depends on core, foundation)
└── presentation/
    ├── cli/
    │   └── (depends on features, core, foundation)
    └── api/
        └── (depends on features, core, foundation)
```

### Bad Architecture ❌

```
src/
├── features/
│   └── auth/
│       └── (depends on presentation)  # ❌ Wrong direction
├── core/
│   └── (depends on features)  # ❌ Wrong direction
└── presentation/
    └── (depends on foundation only)  # ❌ Missing dependencies
```

## Maintenance

### Regular Checks

- **Before every commit**: Run dependency validation
- **Weekly**: Review dependency graph for optimization
- **Before major refactoring**: Document current dependencies
- **After adding new components**: Update DAG documentation

### Tools Integration

Add dependency checks to:
- Pre-commit hooks
- CI/CD pipelines
- AGENT_AUTOMATION workflow
- Quality gates

<!-- DAG:END -->

