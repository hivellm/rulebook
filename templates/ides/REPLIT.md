<!-- REPLIT:START -->
# Replit AI IDE Rules

**CRITICAL**: Specific rules and patterns for Replit AI-powered IDE.

## Replit Overview

Replit is a cloud-based IDE with built-in AI assistance:

- Browser-based development
- Collaborative coding
- Instant deployment
- Built-in AI (Ghostwriter)
- Multiple language support

## Access

```
https://replit.com

# Enable Ghostwriter
Settings → AI → Enable Ghostwriter
```

## Integration with AGENTS.md

### Replit Configuration

Create `.replit` file:

```toml
language = "nodejs"

[deployment]
run = ["npm", "start"]

[env]
STANDARDS_FILE = "AGENTS.md"

[ai]
enabled = true
model = "gpt-4-turbo"
context_files = ["AGENTS.md", "README.md"]
quality_checks = true
```

### Ghostwriter Settings

Configure in Replit UI:

```
Settings → Ghostwriter → Advanced

☑ Enable code completion
☑ Enable code generation
☑ Enable code explanation
☑ Enable code transformation
☑ Follow project standards (AGENTS.md)
☑ Require tests for generated code
☑ Type-safe suggestions only
```

### Project Structure

```
.replit              # Replit configuration
AGENTS.md            # Project standards
README.md            # Project documentation
package.json         # Dependencies
src/                 # Source code
tests/               # Tests
.gitignore          # Git ignore
```

## Replit AI Features

### 1. Ghostwriter Complete

AI code completion as you type:

```typescript
// Type: "function fetchUser"
// Ghostwriter suggests:
async function fetchUserData(userId: string): Promise<User> {
  // Following AGENTS.md TypeScript standards
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  
  return response.json();
}
```

### 2. Ghostwriter Chat

Ask questions about code:

```
"How should I implement user authentication according to AGENTS.md?"

"Generate tests for this function following AGENTS.md standards"

"Refactor this code to match AGENTS.md TypeScript patterns"
```

### 3. Ghostwriter Transform

Transform existing code:

```
Select code → Right-click → Ghostwriter Transform

Options:
- Add types (per AGENTS.md)
- Add error handling
- Add documentation
- Generate tests
- Refactor for clarity
```

### 4. Ghostwriter Explain

Understand code:

```
Select code → Right-click → Ghostwriter Explain

Get explanation with AGENTS.md context
```

## Best Practices

### DO's ✅

- **Always** reference AGENTS.md in prompts
- **Use** Ghostwriter Chat for complex tasks
- **Review** all AI-generated code
- **Test** generated code immediately
- **Leverage** collaborative features
- **Deploy** frequently for testing
- **Use** version control (Git)
- **Document** AI assistance decisions

### DON'Ts ❌

- **Never** deploy untested AI code
- **Never** skip AGENTS.md standards
- **Don't** blindly accept completions
- **Don't** ignore type errors
- **Don't** skip code review
- **Don't** commit without linting
- **Don't** override security settings

## Ghostwriter Prompt Templates

### Feature Implementation

```
Implement [feature name] following AGENTS.md standards:

Requirements from AGENTS.md:
- Language: [language]
- Framework: [framework]
- Test coverage: 95%+
- Type safety: Strict

Include:
- Type definitions
- Implementation
- Unit tests
- Integration tests
- Documentation

Use TDD approach.
```

### Code Review

```
Review this code against AGENTS.md:

[paste code]

Check for:
- Standards compliance
- Type safety
- Test coverage
- Documentation
- Error handling
- Security issues
```

### Refactoring

```
Refactor this code to match AGENTS.md patterns:

[paste code]

Improve:
- Type safety
- Error handling
- Code organization
- Documentation
- Test coverage

Maintain functionality.
```

## Replit-Specific Features

### 1. Collaborative Coding

```
Share → Invite collaborators

All collaborators see:
- AI suggestions
- AGENTS.md standards
- Real-time edits
```

### 2. Instant Deployment

```bash
# Automatic deployment
# Configure in .replit:

[deployment]
run = ["npm", "start"]
deploymentTarget = "cloudrun"

[env]
NODE_ENV = "production"
```

### 3. Database Integration

```python
# Replit DB with AGENTS.md patterns
from replit import db

def store_user(user_data: dict) -> bool:
    """
    Store user data following AGENTS.md standards.
    
    Args:
        user_data: User data to store
        
    Returns:
        Success status
        
    Raises:
        ValueError: If data is invalid
    """
    if not user_data.get('id'):
        raise ValueError('User ID required')
    
    db[f"user:{user_data['id']}"] = user_data
    return True
```

## Quality Checklist

Before deploying Replit AI code:

- [ ] AGENTS.md standards followed
- [ ] Types complete and correct
- [ ] Tests written and passing
- [ ] Documentation included
- [ ] Linting passes
- [ ] No security warnings
- [ ] Error handling robust
- [ ] Performance acceptable
- [ ] Code reviewed
- [ ] Git committed

## Advanced Configuration

### 1. Custom AI Instructions

Create `.ghostwriter/instructions.md`:

```markdown
# Project Instructions for Ghostwriter

## Standards
Always follow AGENTS.md for:
- Coding standards
- Testing requirements
- Documentation format

## Language-Specific
- TypeScript: Strict mode, no any
- Python: Type hints required
- Rust: Edition 2024, clippy clean

## Testing
- Coverage: 95%+ required
- Framework: From AGENTS.md
- TDD approach preferred
```

### 2. Environment Variables

```bash
# .env (never commit!)
DATABASE_URL=
API_KEY=

# Reference in code per AGENTS.md
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY not configured');
}
```

### 3. Custom Commands

```toml
# .replit
[commands]
test = "npm test"
lint = "npm run lint"
format = "npm run format"
typecheck = "npm run type-check"
quality = "npm run lint && npm run type-check && npm test"
```

## Troubleshooting

### AI Not Following Standards

```
In Ghostwriter Chat:

"Read AGENTS.md thoroughly. Your suggestions must strictly follow
the standards defined there, particularly:
- [specific section]
- [specific requirement]

Revise your previous suggestion to comply."
```

### Performance Issues

```
Settings → Ghostwriter → Performance

- Reduce suggestion frequency
- Limit context window
- Disable for large files
- Use local caching
```

### Deployment Failures

```bash
# Check logs
Logs → Runtime Logs

# Verify AGENTS.md compliance
npm run lint
npm test
npm run build

# Then redeploy
```

## Collaboration Tips

1. **Shared Standards**: All collaborators use AGENTS.md
2. **Code Review**: Review AI suggestions together
3. **Pair Programming**: Use Ghostwriter as third participant
4. **Documentation**: Document AI assistance in commits
5. **Testing**: Test collaboratively before deploy

<!-- REPLIT:END -->

