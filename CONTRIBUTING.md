# Contributing to rulebook

Thank you for your interest in contributing to rulebook!

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## How to Contribute

### Reporting Bugs

- Use GitHub Issues
- Include reproduction steps
- Provide system information
- Include error messages and logs

### Suggesting Features

- Open a GitHub Discussion or Issue
- Describe the use case
- Explain why it would be valuable
- Consider proposing an implementation

### Pull Requests

1. **Fork the repository**
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make changes**: Follow coding standards from AGENTS.md
4. **Write tests**: Ensure 95%+ coverage
5. **Run quality checks**:
   ```bash
   npm run type-check
   npm run lint
   npm test
   npm run test:coverage
   ```
6. **Commit**: Use conventional commits
7. **Push**: `git push origin feature/my-feature`
8. **Create PR**: Describe changes clearly

## Development Setup

```bash
# Clone repository
git clone https://github.com/hivellm/rulebook.git
cd rulebook

# Install dependencies
npm install

# Run development mode
npm run dev

# Run tests
npm test
```

## Coding Standards

- Follow AGENTS.md standards
- Write tests for all new code (95%+ coverage)
- Document public APIs
- Use TypeScript strict mode
- Format with Prettier
- Lint with ESLint

## Commit Message Format

Use conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
chore: update dependencies
```

## Review Process

1. Automated checks must pass (CI/CD)
2. Code review by maintainer
3. Address feedback
4. Approval and merge

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---
*For questions, contact Your Name*
