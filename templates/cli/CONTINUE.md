<!-- CONTINUE:START -->
# Continue CLI Rules

**CRITICAL**: Specific rules and patterns for Continue - open source AI coding assistant.

## Continue Overview

Continue is an open-source Copilot alternative that works in VS Code and JetBrains:

```bash
# Install in VS Code
# Search for "Continue" in extensions

# Configure models
# Edit ~/.continue/config.json
```

## Integration with AGENTS.md

### 1. Configuration

Create `.continue/config.json` in project root:

```json
{
  "models": [
    {
      "title": "GPT-4",
      "provider": "openai",
      "model": "gpt-4",
      "apiKey": "your-api-key"
    }
  ],
  "systemMessage": "You are an AI coding assistant. Always follow the standards defined in AGENTS.md in the project root. Ensure all code meets quality requirements: tests with 95%+ coverage, linter compliance, and proper documentation.",
  "contextProviders": [
    {
      "name": "file",
      "params": {
        "files": ["AGENTS.md", "docs/ROADMAP.md"]
      }
    }
  ],
  "slashCommands": [
    {
      "name": "test",
      "description": "Generate tests following AGENTS.md",
      "prompt": "Generate comprehensive tests for the selected code following AGENTS.md standards. Include edge cases, error handling, and achieve 95%+ coverage."
    },
    {
      "name": "review",
      "description": "Review code against AGENTS.md",
      "prompt": "Review this code against AGENTS.md standards. Check for error handling, test coverage, documentation, and code quality issues."
    },
    {
      "name": "refactor",
      "description": "Refactor following AGENTS.md patterns",
      "prompt": "Refactor this code following AGENTS.md patterns for the detected language. Improve code quality while maintaining functionality and tests."
    }
  ]
}
```

### 2. Custom Slash Commands

Define project-specific commands:

```json
{
  "slashCommands": [
    {
      "name": "rust-feature",
      "description": "Implement Rust feature with tests",
      "prompt": "Following AGENTS.md Rust standards (Edition 2024, clippy, tests):\n1. Create tests in /tests/\n2. Implement feature\n3. Add error handling with Result<T, E>\n4. Include inline documentation\n5. Ensure 95%+ coverage"
    },
    {
      "name": "ts-feature",
      "description": "Implement TypeScript feature",
      "prompt": "Following AGENTS.md TypeScript standards (strict mode, ESLint, Vitest):\n1. Create tests\n2. Implement with proper types\n3. Add error handling\n4. Include JSDoc\n5. Verify 95%+ coverage"
    }
  ]
}
```

## Usage Patterns

### 1. Inline Autocomplete

Continue provides completions like Copilot:

```typescript
// Type comment, Continue suggests implementation
// Accept if follows AGENTS.md patterns
// Reject if violates standards

function processUser(input: string): Result<User, ValidationError> {
  // Continue suggests implementation following AGENTS.md patterns
}
```

### 2. Chat Interface

Use Cmd/Ctrl+L to open chat:

```
User: "Following AGENTS.md, implement user authentication with JWT"

Continue: 
"I'll implement following AGENTS.md TypeScript standards:
1. Create tests in /tests/auth.test.ts
2. Implement in /src/auth.ts with proper types
3. Add error handling
4. Include JSDoc documentation
5. Ensure 95%+ coverage

Would you like me to proceed?"

User: "Yes, and use the error handling patterns from AGENTS.md"
```

### 3. Slash Commands

Quick actions with custom commands:

```
/test - Generate tests for selected code
/review - Review against AGENTS.md
/refactor - Refactor following patterns
/rust-feature - Implement Rust feature
/ts-feature - Implement TypeScript feature
```

## Chat Patterns

### Pattern 1: Feature Implementation

```
Select function signature

Cmd/Ctrl+L (open chat)

User:
"/rust-feature Implement user registration"

Continue:
- Creates test file
- Implements feature
- Adds error handling
- Includes documentation
- Verifies coverage
```

### Pattern 2: Test Generation

```
Select function or module

Cmd/Ctrl+L

User:
"/test"

Continue:
- Generates comprehensive tests
- Covers edge cases
- Tests error conditions
- Achieves 95%+ coverage
```

### Pattern 3: Code Review

```
Select code section

Cmd/Ctrl+L

User:
"/review"

Continue:
- Checks against AGENTS.md
- Identifies issues
- Suggests improvements
- Provides specific fixes
```

## Context Providers

### 1. File Context

```json
{
  "contextProviders": [
    {
      "name": "file",
      "params": {
        "files": ["AGENTS.md", "docs/**/*.md"]
      }
    }
  ]
}
```

### 2. Code Context

```json
{
  "contextProviders": [
    {
      "name": "code",
      "params": {
        "nRetrieve": 25,
        "useReranker": true
      }
    }
  ]
}
```

### 3. Documentation Context

```json
{
  "contextProviders": [
    {
      "name": "docs",
      "params": {
        "baseUrl": "https://docs.project.com"
      }
    }
  ]
}
```

## Quality Assurance

### Pre-Commit Checklist

Use Continue to verify:

```
Cmd/Ctrl+L

User:
"Review all changes against AGENTS.md:
1. Check test coverage
2. Run linter
3. Verify documentation
4. Check error handling"

Continue runs checks and reports results
```

### Automated Quality Checks

Configure in `.continue/config.json`:

```json
{
  "experimental": {
    "onSave": {
      "enabled": true,
      "commands": [
        {
          "name": "lint",
          "command": "npm run lint"
        },
        {
          "name": "test",
          "command": "npm test"
        }
      ]
    }
  }
}
```

## Advanced Features

### 1. Custom Models

Use local models:

```json
{
  "models": [
    {
      "title": "Local Llama",
      "provider": "ollama",
      "model": "codellama:13b"
    }
  ]
}
```

### 2. Multi-File Context

```json
{
  "experimental": {
    "contextProvider": {
      "alwaysInclude": [
        "AGENTS.md",
        "docs/ROADMAP.md",
        "package.json"
      ]
    }
  }
}
```

### 3. Codebase Indexing

```json
{
  "experimental": {
    "codebaseIndexing": {
      "enabled": true,
      "indexDirectory": ".continue/index"
    }
  }
}
```

## Best Practices

1. **Reference AGENTS.md**: Always start requests with standards reference
2. **Use Custom Commands**: Create project-specific slash commands
3. **Review Suggestions**: Never blindly accept autocomplete
4. **Test Everything**: Run tests after Continue changes
5. **Iterate**: If result doesn't match standards, ask to fix
6. **Context Matters**: Provide enough context in chat
7. **Stay Consistent**: Use same patterns across project

## Keyboard Shortcuts

```
Cmd/Ctrl+L - Open Continue chat
Cmd/Ctrl+I - Accept inline suggestion
Cmd/Ctrl+Shift+/ - Toggle Continue sidebar
Tab - Accept suggestion
Esc - Reject suggestion
```

## Troubleshooting

### Continue Not Following Standards

```
Solution 1: Add systemMessage referencing AGENTS.md in config
Solution 2: Always start chat with "Following AGENTS.md..."
Solution 3: Create custom slash commands with standards
```

### Poor Suggestions

```
Solution 1: Add more context providers
Solution 2: Be explicit in requests
Solution 3: Use chat instead of autocomplete for complex tasks
```

### Performance Issues

```
Solution 1: Reduce nRetrieve in code context
Solution 2: Disable codebase indexing if not needed
Solution 3: Use smaller/faster models for autocomplete
```

## Configuration Examples

### Rust Project

```json
{
  "systemMessage": "Follow AGENTS.md Rust standards: Edition 2024, clippy -D warnings, 95%+ test coverage",
  "slashCommands": [
    {
      "name": "rust-impl",
      "prompt": "Implement following AGENTS.md Rust patterns with tests, error handling, and docs"
    }
  ]
}
```

### TypeScript Project

```json
{
  "systemMessage": "Follow AGENTS.md TypeScript standards: strict mode, ESLint, Prettier, Vitest",
  "slashCommands": [
    {
      "name": "ts-impl",
      "prompt": "Implement following AGENTS.md TypeScript patterns with tests and types"
    }
  ]
}
```

## Tips for Better Results

1. **Detailed Prompts**: Be specific about requirements
2. **Use Slash Commands**: Faster for common tasks
3. **Provide Examples**: Show desired patterns
4. **Iterate**: Refine until standards met
5. **Test Often**: Verify changes work
6. **Review Diffs**: Check before accepting
7. **Learn Patterns**: Note what works well

<!-- CONTINUE:END -->

