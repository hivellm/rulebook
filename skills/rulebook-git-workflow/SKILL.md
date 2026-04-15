---
name: rulebook-git-workflow
description: "Defines branch naming conventions, conventional commit message format, and pull request description templates. Use when creating feature branches, writing commit messages, preparing pull request descriptions, or reviewing git workflow standards."
version: "1.0.0"
category: core
author: "HiveLLM"
tags: ["git", "workflow", "branching", "commits", "pull-requests"]
dependencies: []
conflicts: []
---

# Git Workflow Standards

## Branch Naming

```
feature/<task-id>-<short-description>
fix/<issue-id>-<short-description>
refactor/<scope>-<description>
docs/<scope>-<description>
```

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### Example

```
feat(auth): add JWT token validation

Implement JWT validation middleware for protected routes.

Closes #123
```

## Pull Request Guidelines

### PR Title
```
feat(scope): short description
```

### PR Description

```markdown
## Summary
Brief description of changes.

## Changes
- Change 1
- Change 2

## Testing
How this was tested.

## Checklist
- [ ] Tests pass
- [ ] Lint passes
- [ ] Documentation updated
```

## Workflow Steps

```bash
# 1. Create feature branch from main
git checkout -b feature/<task-id>-<description> main

# 2. Make commits following conventions
git add <files>
git commit -m "feat(scope): description"

# 3. Run quality checks before push
npm run type-check && npm run lint && npm test

# 4. Push and create PR
git push -u origin feature/<task-id>-<description>
gh pr create --title "feat(scope): description" --body "..."

# 5. Address review feedback with fixup commits
git add <files>
git commit -m "fix(scope): address review feedback"
git push

# 6. Squash and merge (via GitHub UI or CLI)
gh pr merge --squash
```
