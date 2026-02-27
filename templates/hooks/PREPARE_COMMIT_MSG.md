# Prepare Commit Message Hook

This template provides guidance for implementing prepare-commit-msg git hooks that automatically generate or enhance commit messages.

## Purpose

Prepare-commit-msg hooks run before the commit message editor opens to:
- Pre-populate commit messages from branch names
- Add issue/ticket references automatically
- Insert commit templates
- Add metadata (branch, author, timestamps)
- Enforce commit message structure

## Agent Automation Commands

When implementing or modifying prepare-commit-msg hooks:

### Standard Usage
```bash
# Hook runs automatically before commit editor opens
git commit

# Skip hook if needed
git commit --no-verify -m "message"

# Use custom template
git commit --template=.gitmessage
```

## Hook Implementation Patterns

### Node.js Implementation (Recommended)

**Shell Wrapper** (`.git/hooks/prepare-commit-msg`):
```bash
#!/bin/sh

# Arguments:
# $1 = commit message file
# $2 = commit source (message, template, merge, squash, commit)
# $3 = commit SHA (for amend or commit -c)

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

# Execute Node.js script
"$NODE_PATH" "$(dirname "$0")/prepare-commit-msg.js" "$@"
exit $?
```

**Node.js Script** (`.git/hooks/prepare-commit-msg.js`):
```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const [, , messageFile, source, sha] = process.argv;

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
}

function extractIssueNumber(branchName) {
  // Extract issue number from branch names like:
  // - feature/123-user-auth
  // - bugfix/456-memory-leak
  // - PROJ-789-api-update
  const patterns = [
    /\/(\d+)-/,           // feature/123-name
    /\/([A-Z]+-\d+)-/,    // feature/PROJ-123-name
    /#(\d+)/,             // feature/#123
  ];

  for (const pattern of patterns) {
    const match = branchName.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractScope(branchName) {
  // Extract scope from branch names like:
  // - feature/auth/login
  // - fix/api/validation
  const match = branchName.match(/^[^/]+\/([^/]+)\//);
  return match ? match[1] : null;
}

function getCommitType(branchName) {
  const branchTypes = {
    feature: 'feat',
    feat: 'feat',
    bugfix: 'fix',
    fix: 'fix',
    hotfix: 'fix',
    docs: 'docs',
    refactor: 'refactor',
    perf: 'perf',
    test: 'test',
    chore: 'chore',
  };

  for (const [key, type] of Object.entries(branchTypes)) {
    if (branchName.startsWith(key)) {
      return type;
    }
  }

  return null;
}

function main() {
  // Skip for merge, squash, or amend commits
  if (source === 'merge' || source === 'squash' || source === 'commit') {
    process.exit(0);
  }

  // Skip if message already provided via -m flag
  if (source === 'message') {
    process.exit(0);
  }

  const branch = getCurrentBranch();
  const currentMessage = fs.readFileSync(messageFile, 'utf-8');

  // Skip if message already has content (not default template)
  if (currentMessage.trim() && !currentMessage.startsWith('#')) {
    process.exit(0);
  }

  // Build enhanced commit message
  let newMessage = '';

  // Add conventional commit prefix if possible
  const commitType = getCommitType(branch);
  const scope = extractScope(branch);

  if (commitType) {
    newMessage += commitType;
    if (scope) {
      newMessage += `(${scope})`;
    }
    newMessage += ': ';
  }

  // Add placeholder for subject
  newMessage += '<subject>\n\n';

  // Add body template
  newMessage += '# Why (motivation for this change):\n';
  newMessage += '# - \n\n';

  newMessage += '# What (summary of changes):\n';
  newMessage += '# - \n\n';

  // Add issue reference if found
  const issueNumber = extractIssueNumber(branch);
  if (issueNumber) {
    newMessage += `# Refs #${issueNumber}\n`;
  }

  // Add commit message guidelines
  newMessage += '\n# Commit Message Guidelines:\n';
  newMessage += '# - Use imperative mood ("add" not "added" or "adds")\n';
  newMessage += '# - First line should be < 50 chars\n';
  newMessage += '# - Separate subject from body with blank line\n';
  newMessage += '# - Wrap body at 72 chars\n';
  newMessage += `# - Branch: ${branch}\n`;

  fs.writeFileSync(messageFile, newMessage);
  process.exit(0);
}

main();
```

### Shell-Only Implementation (Simple)

**`.git/hooks/prepare-commit-msg`**:
```bash
#!/bin/sh

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
SHA=$3

# Skip for merge commits
if [ "$COMMIT_SOURCE" = "merge" ]; then
  exit 0
fi

# Skip if message already provided
if [ "$COMMIT_SOURCE" = "message" ]; then
  exit 0
fi

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Extract issue number from branch (e.g., feature/123-user-auth)
ISSUE=$(echo "$BRANCH" | grep -oE '[0-9]+' | head -1)

# Add issue reference if found
if [ -n "$ISSUE" ]; then
  echo "" >> "$COMMIT_MSG_FILE"
  echo "Refs #$ISSUE" >> "$COMMIT_MSG_FILE"
fi

exit 0
```

## Best Practices

### ✅ DO Include in Prepare-Commit-Msg

1. **Issue References from Branch**
   ```javascript
   const issue = extractIssueNumber(branch);
   if (issue) {
     message += `\nRefs #${issue}`;
   }
   ```

2. **Conventional Commit Type**
   ```javascript
   const type = getCommitType(branch); // feat, fix, etc.
   if (type) {
     message = `${type}: ${message}`;
   }
   ```

3. **Scope from Branch**
   ```javascript
   const scope = extractScope(branch); // api, ui, auth
   if (scope) {
     message = `${type}(${scope}): ${message}`;
   }
   ```

4. **Commit Template**
   ```javascript
   message += '\n# Why:\n# - \n\n';
   message += '# What:\n# - \n';
   ```

5. **Helpful Guidelines**
   ```javascript
   message += '\n# Guidelines:\n';
   message += '# - Use imperative mood\n';
   message += '# - Keep first line < 50 chars\n';
   ```

### ❌ DON'T Include in Prepare-Commit-Msg

1. **Complete Messages** - Let developers write the description
2. **Validation** - Use commit-msg hook for validation
3. **External API Calls** - Keep hook fast
4. **Interactive Prompts** - Hook runs non-interactively

## Branch Naming Patterns

### Recommended Branch Naming

**With Issue Numbers**:
```
feature/123-user-authentication
bugfix/456-memory-leak
hotfix/789-critical-security
docs/321-api-documentation
```

**With Scope**:
```
feature/auth/oauth-integration
fix/api/validation-error
refactor/ui/button-component
```

**Jira/Linear Style**:
```
feature/PROJ-123-user-login
fix/PROJ-456-api-timeout
```

### Extraction Logic

```javascript
function extractFromBranch(branch) {
  // Pattern 1: type/number-description
  let match = branch.match(/^([^/]+)\/(\d+)-(.+)$/);
  if (match) {
    return {
      type: mapType(match[1]),      // feature -> feat
      issue: match[2],               // 123
      description: match[3],         // user-authentication
    };
  }

  // Pattern 2: type/scope/description
  match = branch.match(/^([^/]+)\/([^/]+)\/(.+)$/);
  if (match) {
    return {
      type: mapType(match[1]),      // feature -> feat
      scope: match[2],               // auth
      description: match[3],         // oauth-integration
    };
  }

  // Pattern 3: type/PROJ-number-description
  match = branch.match(/^([^/]+)\/([A-Z]+-\d+)-(.+)$/);
  if (match) {
    return {
      type: mapType(match[1]),      // feature -> feat
      issue: match[2],               // PROJ-123
      description: match[3],         // user-login
    };
  }

  return null;
}
```

## Advanced Patterns

### Add Co-Authors from Git Config

```javascript
function getTeamMembers() {
  // Read from .git/config or custom config file
  const config = fs.readFileSync('.git/config', 'utf-8');
  const members = [];

  const matches = config.matchAll(/co-author-(\w+) = (.+) <(.+)>/g);
  for (const match of matches) {
    members.push({ name: match[2], email: match[3] });
  }

  return members;
}

function addCoAuthors(message) {
  const members = getTeamMembers();
  if (members.length > 0) {
    message += '\n\n# Co-Authors (uncomment if applicable):\n';
    members.forEach(m => {
      message += `# Co-authored-by: ${m.name} <${m.email}>\n`;
    });
  }
  return message;
}
```

### Add Related Files

```javascript
function getStagedFiles() {
  const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
  return output.trim().split('\n').filter(f => f);
}

function addFilesSummary(message) {
  const files = getStagedFiles();
  if (files.length > 0) {
    message += '\n# Files changed:\n';
    files.forEach(f => {
      message += `#   ${f}\n`;
    });
  }
  return message;
}
```

### Add Recent Commits Context

```javascript
function getRecentCommits(count = 5) {
  const output = execSync(`git log -${count} --oneline`, { encoding: 'utf-8' });
  return output.trim().split('\n');
}

function addCommitContext(message) {
  const commits = getRecentCommits();
  message += '\n# Recent commits:\n';
  commits.forEach(c => {
    message += `#   ${c}\n`;
  });
  return message;
}
```

### Branch-Specific Templates

```javascript
function getTemplate(branch) {
  if (branch === 'main' || branch === 'master') {
    return {
      requireIssue: true,
      requireBreakingChange: true,
      template: 'production',
    };
  }

  if (branch.startsWith('hotfix/')) {
    return {
      requireIssue: true,
      urgent: true,
      template: 'hotfix',
    };
  }

  if (branch.startsWith('feature/')) {
    return {
      requireIssue: false,
      template: 'feature',
    };
  }

  return { template: 'default' };
}
```

## Commit Message Templates

### Feature Template

```
feat(<scope>): <subject>

## Why
- Motivation for this feature
- Problem it solves

## What
- Summary of implementation
- Key changes made

## How to Test
- Steps to verify functionality

Refs #<issue>
```

### Bugfix Template

```
fix(<scope>): <subject>

## Problem
- Description of bug
- Steps to reproduce
- Expected vs actual behavior

## Solution
- How bug was fixed
- Root cause identified

## Testing
- Verification steps
- Regression testing done

Fixes #<issue>
```

### Hotfix Template

```
fix!: <critical-issue>

CRITICAL HOTFIX

## Issue
- Production problem description
- Impact and severity

## Fix
- Immediate solution applied
- Temporary vs permanent fix

## Verification
- Testing performed
- Rollback plan

Fixes #<issue>
```

## Troubleshooting

### Template Not Appearing

**Causes**:
1. Hook permissions incorrect
2. Source type is 'message' (using -m flag)
3. Merge/squash commit

**Solutions**:
```bash
# Check permissions
chmod +x .git/hooks/prepare-commit-msg

# Test manually
.git/hooks/prepare-commit-msg .git/COMMIT_EDITMSG template

# Check source type in hook
echo "Source: $2" >> /tmp/hook-debug.log
```

### Issue Number Not Extracted

**Issue**: Branch name doesn't match regex

**Solution**: Add more patterns:
```javascript
const patterns = [
  /\/(\d+)-/,                    // feature/123-name
  /\/([A-Z]+-\d+)-/,             // feature/PROJ-123-name
  /#(\d+)/,                      // feature/#123
  /^(\d+)-/,                     // 123-feature-name
  /\[(\d+)\]/,                   // feature-[123]-name
  /([A-Z]{2,}-\d+)/,             // JIRA-123
];
```

### Template Overrides User Message

**Issue**: Hook overwrites existing message

**Solution**: Check if message already exists:
```javascript
const currentMessage = fs.readFileSync(messageFile, 'utf-8');

// Skip if message has content (not just comments)
if (currentMessage.trim() && !currentMessage.startsWith('#')) {
  process.exit(0);
}
```

## Integration with Tools

### Git Config Template

```bash
# Set global commit template
git config --global commit.template ~/.gitmessage

# Create template file
cat > ~/.gitmessage << 'EOF'
# <type>(<scope>): <subject>

# Why:
# -

# What:
# -

# Refs #
EOF
```

### Commitizen Integration

```bash
# Install commitizen
npm install --save-dev commitizen cz-conventional-changelog

# Configure
echo '{"path": "cz-conventional-changelog"}' > .czrc

# Use instead of git commit
npx cz
```

## Integration with Rulebook

If using `@hivehub/rulebook`, prepare-commit-msg hooks are automatically generated:

```bash
# Initialize with hooks
npx @hivehub/rulebook init

# Configuration in .rulebook
{
  "hooks": {
    "prepareCommitMsg": {
      "enabled": true,
      "extractIssue": true,
      "addTemplate": true,
      "addGuidelines": true
    }
  }
}
```

## Common Pitfalls

1. **❌ Overwriting existing messages**: Check if message already exists
2. **❌ Slow execution**: Avoid external API calls
3. **❌ Complex regex**: Test branch name patterns thoroughly
4. **❌ No escape for merge commits**: Check source type
5. **❌ Not skipping -m commits**: Check if source is 'message'

## Related Templates

- See `/.rulebook/specs/COMMIT_MSG.md` for commit message validation
- See `/.rulebook/specs/GIT.md` for git workflow and branch naming
- See `/.rulebook/specs/PRE_COMMIT.md` for pre-commit checks
