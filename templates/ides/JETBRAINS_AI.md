<!-- JETBRAINS_AI:START -->
# JetBrains AI Assistant Rules

**CRITICAL**: Specific rules and patterns for JetBrains AI Assistant.

## JetBrains AI Overview

AI Assistant is integrated into all JetBrains IDEs:

- IntelliJ IDEA
- PyCharm
- WebStorm
- PhpStorm
- GoLand
- RustRover
- Rider (.NET)
- CLion (C/C++)

## Installation

```
Settings/Preferences → Plugins → Marketplace
Search: "AI Assistant"
Install and restart IDE
```

## Integration with AGENTS.md

### AI Assistant Configuration

Create `.idea/ai-assistant.xml`:

```xml
<component name="AIAssistant">
  <option name="enabled" value="true" />
  <option name="provider" value="jetbrains" />
  <option name="projectStandards" value="AGENTS.md" />
  <option name="contextFiles">
    <list>
      <option value="AGENTS.md" />
      <option value="README.md" />
      <option value="docs/ROADMAP.md" />
    </list>
  </option>
  <option name="qualitySettings">
    <map>
      <entry key="requireTests" value="true" />
      <entry key="minCoverage" value="95" />
      <entry key="enforceTypes" value="true" />
      <entry key="runInspections" value="true" />
    </map>
  </option>
</component>
```

### Project-Specific Prompts

Create `.idea/ai-prompts.md`:

```markdown
# AI Assistant Project Instructions

## Always Reference
- AGENTS.md for coding standards
- Project inspection profile
- Code style settings

## Code Generation
- Follow AGENTS.md language standards
- Include comprehensive tests (95%+ coverage)
- Add complete type annotations
- Include JSDoc/KDoc/DocStrings

## Refactoring
- Maintain AGENTS.md patterns
- Keep test coverage
- Preserve API contracts
- Update documentation
```

## JetBrains AI Features

### 1. AI Chat

```
View → Tool Windows → AI Assistant

Chat Commands:
- Explain code
- Generate tests
- Refactor
- Find bugs
- Optimize performance
- Generate documentation
```

### 2. Inline Completions

Smart code completion with AI:

```kotlin
// Type: "fun processUser"
// AI suggests:
fun processUserData(user: User): Result<ProcessedUser> {
    // Following AGENTS.md Kotlin standards
    return try {
        val validated = validateUser(user)
        val processed = transformUser(validated)
        Result.success(processed)
    } catch (e: ValidationException) {
        Result.failure(e)
    }
}
```

### 3. Context Actions

```
Alt+Enter → AI Actions

- Generate tests (AGENTS.md compliant)
- Add documentation
- Refactor to pattern
- Fix code issues
- Optimize imports
```

### 4. Commit Message Generation

```
Commit → Generate with AI

AI reads:
- AGENTS.md commit conventions
- Changed files
- Diff content

Generates conventional commit message
```

## Best Practices

### DO's ✅

- **Configure** AI with AGENTS.md context
- **Use** IDE inspections with AI
- **Leverage** language-specific features
- **Review** AI suggestions in diff view
- **Run** tests after AI changes
- **Use** AI for documentation
- **Combine** with refactoring tools
- **Enable** code analysis

### DON'Ts ❌

- **Never** disable inspections
- **Never** skip test generation
- **Don't** ignore AGENTS.md standards
- **Don't** accept without review
- **Don't** bypass code analysis
- **Don't** skip type checking
- **Don't** commit untested AI code

## Language-Specific Integration

### Kotlin/Java

```kotlin
// AI understands project patterns
class UserService @Inject constructor(
    private val repository: UserRepository
) {
    // AI suggests following established patterns
    suspend fun getUser(id: UserId): User? {
        // Type-safe, null-safe, following AGENTS.md
        return repository.findById(id)
    }
}
```

### Python

```python
# AI follows project type hints
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class User:
    id: str
    name: str
    email: str

def process_users(users: List[User]) -> List[User]:
    """
    Process users following AGENTS.md standards.
    
    AI generates complete implementation with:
    - Type hints
    - Docstrings
    - Error handling
    - Tests
    """
    # AI implementation here
```

### TypeScript/JavaScript

```typescript
// AI suggests TypeScript patterns
interface UserData {
  id: string;
  name: string;
  email: string;
}

// AI follows AGENTS.md async patterns
async function fetchUserData(
  userId: string
): Promise<UserData> {
  // Type-safe, error-handled implementation
}
```

## Prompt Templates

### Feature Implementation

```
In AI Chat:

"Implement user authentication feature following AGENTS.md:

Context files: AGENTS.md, src/auth/

Requirements:
- Language standards from AGENTS.md
- TDD approach
- 95%+ test coverage
- Complete type safety
- Error handling
- Documentation

Generate:
1. Interface definitions
2. Implementation
3. Unit tests
4. Integration tests"
```

### Code Review

```
Select code → AI Chat:

"Review this code against AGENTS.md standards:

Check:
- Code style compliance
- Type safety
- Test coverage
- Documentation
- Error handling
- Performance
- Security

Provide specific improvements."
```

### Test Generation

```
Place cursor in function → Alt+Enter → Generate Tests

"Generate comprehensive tests following AGENTS.md:
- Unit tests for all paths
- Edge cases
- Error scenarios
- Integration tests
- Coverage: 95%+
- Framework: [from AGENTS.md]"
```

## Advanced Features

### 1. Refactoring with AI

```
Select code → Refactor → AI Refactor

AI suggests refactorings:
- Extract method/class
- Introduce parameter object
- Replace conditional with polymorphism
- Modernize code
All following AGENTS.md patterns
```

### 2. Code Analysis

```
Analyze → Inspect Code with AI

AI enhances inspections:
- AGENTS.md compliance
- Performance issues
- Security vulnerabilities
- Code smells
- Best practice violations
```

### 3. Documentation Generation

```
Place cursor in function → Generate Documentation

AI creates:
- KDoc/JavaDoc/JSDoc per AGENTS.md
- Parameter descriptions
- Return value docs
- Exception documentation
- Usage examples
```

## Quality Checklist

Before accepting JetBrains AI suggestions:

- [ ] Passes all IDE inspections
- [ ] AGENTS.md standards followed
- [ ] Tests generated and passing
- [ ] Types complete and correct
- [ ] Documentation included
- [ ] No code analysis warnings
- [ ] Follows project patterns
- [ ] Security checks passed
- [ ] Performance acceptable

## IDE Integration Tips

1. **Inspections**: Configure per AGENTS.md
2. **Code Style**: Import AGENTS.md style
3. **File Templates**: Create AGENTS.md templates
4. **Live Templates**: Add common patterns
5. **Intentions**: Custom intentions for standards
6. **Structural Search**: Find non-compliant code
7. **Scope**: Define AGENTS.md scope
8. **Profiles**: Create AGENTS.md inspection profile

## Troubleshooting

### AI Not Following Project Standards

```
AI Chat:

"Review AGENTS.md carefully. Your previous suggestion doesn't match:
- [specific standard from AGENTS.md]

Required changes:
- [list requirements]

Please revise following AGENTS.md exactly."
```

### Performance Issues

```
Settings → AI Assistant → Performance

☑ Reduce suggestion frequency
☑ Limit context size  
☑ Disable for large files
☐ Use cloud processing
☑ Cache AI responses
```

### Incorrect Suggestions

```
1. Check AGENTS.md is in project root
2. Verify .idea/ai-assistant.xml config
3. Review inspection profile
4. Check code style settings
5. Restart IDE to reload config
```

<!-- JETBRAINS_AI:END -->

