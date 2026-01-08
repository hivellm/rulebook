# Commit Message Hook

This template provides guidance for implementing commit-msg git hooks that enforce commit message standards and conventions.

## Purpose

Commit-msg hooks run after commit message is entered to:
- Enforce conventional commit format
- Validate commit message structure
- Ensure clear, actionable commit messages
- Maintain consistent commit history
- Enable automated changelog generation

## Agent Automation Commands

When implementing or modifying commit-msg hooks, use these patterns:

### Standard Commit Format
```bash
# Conventional Commits format
git commit -m "feat: add user authentication"
git commit -m "fix: resolve memory leak in parser"
git commit -m "docs: update API documentation"

# With scope
git commit -m "feat(auth): add JWT token validation"
git commit -m "fix(api): handle null responses gracefully"

# With breaking change
git commit -m "feat!: redesign API endpoints" -m "BREAKING CHANGE: API v1 endpoints removed"

# Skip validation (emergency only)
git commit --no-verify -m "WIP: work in progress"
```

## Conventional Commits Format

### Structure
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Required Components

**Type** (required): Must be one of:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

**Subject** (required):
- Brief description (50 chars or less)
- Lowercase first letter
- No period at end
- Imperative mood ("add" not "added" or "adds")

**Scope** (optional):
- Noun describing section of codebase
- Examples: `api`, `ui`, `auth`, `parser`, `cli`

**Body** (optional):
- Detailed explanation
- Separate from subject with blank line
- Wrap at 72 characters

**Footer** (optional):
- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Closes #123, #456`
- Co-authors: `Co-authored-by: Name <email>`

### Examples

**Good Commits**:
```
feat(auth): add OAuth2 authentication

Implement OAuth2 flow with support for Google and GitHub providers.
Includes token refresh mechanism and secure storage.

Closes #234
```

```
fix: prevent race condition in task queue

Add mutex to protect concurrent access to task queue.
This resolves intermittent task duplication issues.

Fixes #567
```

```
docs: add contributing guidelines

Create CONTRIBUTING.md with:
- Code style requirements
- PR submission process
- Testing guidelines
```

**Bad Commits** (will be rejected):
```
❌ "Fixed stuff"                    # No type, unclear
❌ "feat: Added new feature."       # Period at end, "Added" not imperative
❌ "WIP"                            # No type, not descriptive
❌ "Update files"                   # No type, too vague
```

## Hook Implementation Patterns

### Node.js Implementation (Recommended)

**Shell Wrapper** (`.git/hooks/commit-msg`):
```bash
#!/bin/sh

# Find Node.js executable (cross-platform)
NODE_PATH=""
if command -v node >/dev/null 2>&1; then
    NODE_PATH="node"
elif [ -f "/c/Program Files/nodejs/node.exe" ]; then
    NODE_PATH="/c/Program Files/nodejs/node.exe"
elif [ -f "/usr/bin/node" ]; then
    NODE_PATH="/usr/bin/node"
else
    echo "Error: Node.js not found"
    exit 1
fi

# Execute Node.js script with commit message file path
"$NODE_PATH" "$(dirname "$0")/commit-msg.js" "$1"
exit $?
```

**Node.js Script** (`.git/hooks/commit-msg.js`):
```javascript
#!/usr/bin/env node

const fs = require('fs');

// Conventional commit pattern
const PATTERN = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .{1,50}$/;

const TYPES = {
  feat: 'A new feature',
  fix: 'A bug fix',
  docs: 'Documentation only changes',
  style: 'Code style changes (formatting, semicolons, etc.)',
  refactor: 'Code refactor without fixing bugs or adding features',
  perf: 'Performance improvement',
  test: 'Adding or updating tests',
  build: 'Changes to build system or dependencies',
  ci: 'Changes to CI configuration',
  chore: 'Other changes (tooling, etc.)',
  revert: 'Reverts a previous commit',
};

function validateCommitMessage(message) {
  const lines = message.split('\n');
  const subject = lines[0];

  // Check if matches conventional commit format
  if (!PATTERN.test(subject)) {
    return {
      valid: false,
      errors: [
        'Commit message does not follow Conventional Commits format.',
        '',
        'Expected format: <type>(<scope>): <subject>',
        '',
        'Valid types:',
        ...Object.entries(TYPES).map(([type, desc]) => `  ${type.padEnd(10)} - ${desc}`),
        '',
        'Examples:',
        '  feat: add user authentication',
        '  fix(api): resolve null pointer exception',
        '  docs: update README with installation steps',
        '',
        'Your message:',
        `  "${subject}"`,
      ],
    };
  }

  // Check subject length
  if (subject.length > 72) {
    return {
      valid: false,
      errors: [
        `Subject line too long (${subject.length} > 72 characters)`,
        'Keep the subject line concise and under 72 characters.',
      ],
    };
  }

  // Check for period at end
  if (subject.endsWith('.')) {
    return {
      valid: false,
      errors: [
        'Subject line should not end with a period.',
        '',
        'Correct format:',
        `  ${subject.slice(0, -1)}`,
      ],
    };
  }

  // Check for capital letter after colon
  const colonIndex = subject.indexOf(':');
  if (colonIndex !== -1 && subject[colonIndex + 2] && subject[colonIndex + 2] !== subject[colonIndex + 2].toLowerCase()) {
    return {
      valid: false,
      errors: [
        'Subject should start with lowercase letter after colon.',
        '',
        'Correct format:',
        `  ${subject.slice(0, colonIndex + 2)}${subject[colonIndex + 2].toLowerCase()}${subject.slice(colonIndex + 3)}`,
      ],
    };
  }

  return { valid: true };
}

function main() {
  const messageFile = process.argv[2];

  if (!messageFile) {
    console.error('❌ No commit message file provided');
    process.exit(1);
  }

  const message = fs.readFileSync(messageFile, 'utf-8').trim();

  // Skip validation for merge commits, revert commits, etc.
  if (message.startsWith('Merge') || message.startsWith('Revert')) {
    process.exit(0);
  }

  const result = validateCommitMessage(message);

  if (!result.valid) {
    console.error('\n❌ Invalid commit message!\n');
    console.error(result.errors.join('\n'));
    console.error('\n💡 Use --no-verify to skip validation (not recommended)\n');
    process.exit(1);
  }

  console.log('✅ Commit message valid');
  process.exit(0);
}

main();
```

### Shell-Only Implementation (Simple)

**`.git/hooks/commit-msg`**:
```bash
#!/bin/sh

# Read commit message
MESSAGE=$(cat "$1")

# Skip merge commits
if echo "$MESSAGE" | grep -q "^Merge"; then
  exit 0
fi

# Check conventional commit format
if ! echo "$MESSAGE" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .{1,50}"; then
  echo ""
  echo "❌ Invalid commit message format!"
  echo ""
  echo "Expected: <type>(<scope>): <subject>"
  echo ""
  echo "Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
  echo ""
  echo "Examples:"
  echo "  feat: add user authentication"
  echo "  fix(api): resolve null pointer"
  echo "  docs: update README"
  echo ""
  exit 1
fi

echo "✅ Commit message valid"
exit 0
```

## Advanced Validation Rules

### Check for Issue References

```javascript
function validateIssueReference(message, requiredForTypes = ['feat', 'fix']) {
  const lines = message.split('\n');
  const subject = lines[0];
  const type = subject.match(/^([a-z]+)/)?.[1];

  // Check if issue reference required for this type
  if (requiredForTypes.includes(type)) {
    const hasIssueRef = /(?:closes|fixes|resolves|refs?) #\d+/i.test(message);

    if (!hasIssueRef) {
      return {
        valid: false,
        errors: [
          `Commit type '${type}' requires an issue reference.`,
          '',
          'Add to footer:',
          '  Closes #123',
          '  Fixes #456',
          '  Refs #789',
        ],
      };
    }
  }

  return { valid: true };
}
```

### Check for Breaking Changes

```javascript
function validateBreakingChange(message) {
  const hasBreakingIndicator = /^[a-z]+(\(.+\))?!:/.test(message);
  const hasBreakingFooter = /BREAKING CHANGE:/m.test(message);

  if (hasBreakingIndicator && !hasBreakingFooter) {
    return {
      valid: false,
      errors: [
        'Breaking change indicator (!) used but no BREAKING CHANGE footer found.',
        '',
        'Add to footer:',
        '  BREAKING CHANGE: description of what broke',
      ],
    };
  }

  return { valid: true };
}
```

### Check for Co-Authors

```javascript
function validateCoAuthors(message) {
  const coAuthorLines = message.match(/^Co-authored-by: .+/gm) || [];

  for (const line of coAuthorLines) {
    // Validate email format
    if (!/^Co-authored-by: .+ <.+@.+\..+>$/.test(line)) {
      return {
        valid: false,
        errors: [
          'Invalid Co-authored-by format.',
          '',
          'Expected format:',
          '  Co-authored-by: Name <email@example.com>',
          '',
          `Got: ${line}`,
        ],
      };
    }
  }

  return { valid: true };
}
```

## Best Practices

### ✅ DO

1. **Keep subject line concise** (50 characters or less)
2. **Use imperative mood** ("add" not "added")
3. **Reference issues** in footer for feat/fix commits
4. **Document breaking changes** with BREAKING CHANGE footer
5. **Add body** for complex changes (explain why, not what)
6. **Use scopes** for multi-module projects
7. **Start with lowercase** after colon

### ❌ DON'T

1. **Don't end subject with period**
2. **Don't use past tense** ("added" or "adds")
3. **Don't be vague** ("fix stuff", "update files")
4. **Don't exceed 72 characters** in subject
5. **Don't mix multiple changes** in one commit
6. **Don't forget issue references** for bug fixes
7. **Don't capitalize** first word after colon

## Automated Commit Message Preparation

Use `prepare-commit-msg` hook to pre-populate message:

**`.git/hooks/prepare-commit-msg`**:
```bash
#!/bin/sh

# Get branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Extract issue number from branch (e.g., feature/123-user-auth)
ISSUE=$(echo "$BRANCH" | grep -oE '[0-9]+' | head -1)

# Add issue reference if found
if [ -n "$ISSUE" ]; then
  echo "" >> "$1"
  echo "Refs #$ISSUE" >> "$1"
fi
```

## Integration with Tools

### Commitlint (npm)

```bash
# Install
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Configure
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# Create hook
echo "npx --no -- commitlint --edit \$1" > .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

### Husky + Commitlint

```bash
# Install
npm install --save-dev husky @commitlint/cli @commitlint/config-conventional

# Setup husky
npx husky init

# Add commit-msg hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

## Troubleshooting

### Hook Not Running

**Solutions**:
1. Check permissions: `chmod +x .git/hooks/commit-msg`
2. Verify shebang: `#!/bin/sh`
3. Check file location: Must be `.git/hooks/commit-msg` (no extension)

### False Positives

**Issue**: Valid messages rejected

**Solutions**:
1. Adjust regex pattern for your team's conventions
2. Add exceptions for specific message patterns
3. Allow more types if needed (e.g., `wip`, `hotfix`)

### Merge Commits Failing

**Issue**: Merge commit messages rejected

**Solution**: Skip validation for merge commits:
```javascript
if (message.startsWith('Merge') || message.startsWith('Revert')) {
  process.exit(0);
}
```

## Emergency Bypass

```bash
# Skip commit-msg validation
git commit --no-verify -m "Emergency fix"

# Or use environment variable
HUSKY_SKIP_HOOKS=1 git commit -m "message"
```

## Integration with Rulebook

If using `@hivehub/rulebook`, commit-msg hooks are automatically generated:

```bash
# Initialize with hooks
npx @hivehub/rulebook init

# Configuration in .rulebook
{
  "hooks": {
    "commitMsg": {
      "enabled": true,
      "enforceConventional": true,
      "requireIssueRef": ["feat", "fix"]
    }
  }
}
```

## Common Pitfalls

1. **❌ Too strict validation**: Allow flexibility for trivial commits
2. **❌ No escape hatch**: Always allow `--no-verify`
3. **❌ Blocking merge commits**: Skip validation for merge/revert
4. **❌ Unclear error messages**: Show examples of valid format
5. **❌ Not documenting conventions**: Add CONTRIBUTING.md with examples

## Related Templates

- See `/rulebook/PRE_COMMIT.md` for quality checks before commit
- See `/rulebook/PREPARE_COMMIT_MSG.md` for auto-generating commit messages
- See `/rulebook/GIT.md` for git workflow and commit conventions
- See `/rulebook/DOCUMENTATION_RULES.md` for changelog generation from commits
