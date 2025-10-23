<!-- TABNINE:START -->
# Tabnine IDE Rules

**CRITICAL**: Specific rules and patterns for Tabnine AI code completion.

## Tabnine Overview

Tabnine is an AI code completion tool that works across multiple IDEs:

- VS Code
- IntelliJ IDEA / JetBrains IDEs
- Visual Studio
- Sublime Text
- Vim/Neovim
- Atom

## Installation

```bash
# VS Code
ext install TabNine.tabnine-vscode

# JetBrains IDEs
# Install via Plugins marketplace

# Vim
Plug 'codota/tabnine-vim'
```

## Integration with AGENTS.md

### Tabnine Configuration

Create `.tabnine` directory with `config.json`:

```json
{
  "semantic_status": "Enabled",
  "local_enabled": true,
  "cloud_enabled": true,
  "team_learning": true,
  "project_context": {
    "standards_file": "AGENTS.md",
    "auto_learn_patterns": true
  },
  "quality_settings": {
    "suggest_tests": true,
    "enforce_types": true,
    "follow_style_guide": true
  }
}
```

### VS Code Settings

```json
{
  "tabnine.experimentalAutoImports": true,
  "tabnine.debounceMilliseconds": 300,
  "tabnine.receiveBetaChannelUpdates": true,
  
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true
  },
  
  "tabnine.priority": {
    "AGENTS.md": "high",
    "README.md": "medium"
  }
}
```

### JetBrains Settings

```xml
<!-- .idea/tabnine.xml -->
<component name="TabnineSettings">
  <option name="enabled" value="true" />
  <option name="cloudEnabled" value="true" />
  <option name="semanticCompletion" value="true" />
  <option name="projectStandards" value="AGENTS.md" />
</component>
```

## Tabnine Best Practices

### 1. Team Learning

**CRITICAL**: Enable team learning to share patterns:

```
Tabnine Settings → Team Learning → Enable

This allows Tabnine to learn from your codebase and AGENTS.md patterns.
```

### 2. Semantic Completion

Use semantic completion for better suggestions:

```
Tabnine Settings → Semantic Completion → Enable

Tabnine will understand context from AGENTS.md and suggest accordingly.
```

### 3. Custom Patterns

Train Tabnine on project patterns:

1. Open AGENTS.md frequently
2. Write code following AGENTS.md standards
3. Accept suggestions that match standards
4. Reject suggestions that don't comply

### 4. Inline Documentation

Tabnine learns from comments:

```typescript
// Following AGENTS.md TypeScript standards:
// - Strict types
// - 95%+ test coverage
// - ESLint + Prettier

export class UserService {
  // Tabnine will suggest implementations matching these standards
}
```

## Tabnine Features

### 1. Whole Line Completion

Tabnine suggests entire lines based on context:

```typescript
// Type: "async function fetch"
// Tabnine suggests:
async function fetchUserData(userId: string): Promise<User> {
  // Implementation following AGENTS.md patterns
}
```

### 2. Full Function Completion

```typescript
// Type: "function processData"
// Tabnine suggests complete function with:
// - Type annotations
// - Error handling
// - Tests (if configured)
```

### 3. Code Snippets

Create snippets for common AGENTS.md patterns:

```json
{
  "tabnine.snippets": {
    "test-template": {
      "prefix": "test",
      "body": [
        "describe('$1', () => {",
        "  it('should $2', () => {",
        "    // Arrange",
        "    $3",
        "    // Act",
        "    $4",
        "    // Assert",
        "    expect($5).toBe($6);",
        "  });",
        "});"
      ]
    }
  }
}
```

## Best Practices

### DO's ✅

- **Enable** team learning for shared patterns
- **Train** Tabnine by writing good code
- **Accept** suggestions that match AGENTS.md
- **Use** semantic completion
- **Configure** project-specific settings
- **Review** suggestions before accepting
- **Leverage** multi-line completions
- **Keep** AGENTS.md open while coding

### DON'Ts ❌

- **Don't** blindly accept all suggestions
- **Don't** disable type checking
- **Don't** skip code review
- **Don't** ignore AGENTS.md patterns
- **Don't** accept untested code
- **Don't** override project conventions
- **Don't** use without project context

## Advanced Configuration

### 1. Language-Specific Settings

```json
{
  "tabnine.languageSettings": {
    "typescript": {
      "strictTypes": true,
      "preferArrowFunctions": true,
      "maxLineLength": 100
    },
    "python": {
      "preferTypeHints": true,
      "maxLineLength": 88
    },
    "rust": {
      "edition": "2024",
      "strictLinting": true
    }
  }
}
```

### 2. Custom Training Data

Point Tabnine to key files:

```json
{
  "tabnine.trainingFiles": [
    "AGENTS.md",
    "src/**/*.ts",
    "tests/**/*.test.ts",
    "docs/ARCHITECTURE.md"
  ]
}
```

### 3. Exclude Patterns

```json
{
  "tabnine.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/coverage/**"
  ]
}
```

## Integration Patterns

### 1. Test-Driven Development

```typescript
// Write test first
it('should process user data', () => {
  // Tabnine suggests test implementation
});

// Then write implementation
function processUserData(data: UserData): ProcessedData {
  // Tabnine suggests implementation matching test
}
```

### 2. Type-Safe Code

```typescript
// Define types first
interface User {
  id: string;
  name: string;
  email: string;
}

// Tabnine suggests type-safe implementations
function getUser(id: string): User {
  // Suggestions are type-aware
}
```

### 3. Documentation

```typescript
/**
 * Processes user data according to AGENTS.md standards.
 * 
 * @param data - The user data to process
 * @returns Processed user data
 * @throws {ValidationError} If data is invalid
 */
// Tabnine learns from JSDoc and suggests matching implementations
```

## Quality Checklist

When using Tabnine suggestions:

- [ ] Matches AGENTS.md coding standards
- [ ] Includes proper types
- [ ] Has error handling
- [ ] Follows naming conventions
- [ ] Includes documentation
- [ ] Passes linting rules
- [ ] Fits project patterns
- [ ] No security issues
- [ ] Performance acceptable

## Tips for Better Completions

1. **Consistent Style**: Write consistent code, Tabnine learns
2. **Good Names**: Use descriptive names, get better suggestions
3. **Comments**: Add context comments for better completions
4. **Patterns**: Follow AGENTS.md patterns consistently
5. **Review**: Always review suggested code
6. **Accept Wisely**: Only accept matching suggestions
7. **Train**: Reject bad suggestions to train Tabnine
8. **Context**: Keep relevant files open

## Troubleshooting

### Poor Suggestions

```
1. Check team learning is enabled
2. Verify AGENTS.md is in project root
3. Ensure semantic completion is on
4. Review training data settings
5. Check language-specific config
```

### Performance Issues

```json
{
  "tabnine.debounceMilliseconds": 500,
  "tabnine.maxResults": 3,
  "tabnine.localEnabled": true,
  "tabnine.cloudEnabled": false
}
```

### Security Concerns

```json
{
  "tabnine.certificatesDomain": "",
  "tabnine.disableLineRegexPatterns": [
    ".*password.*",
    ".*secret.*",
    ".*api[_-]?key.*"
  ]
}
```

<!-- TABNINE:END -->

