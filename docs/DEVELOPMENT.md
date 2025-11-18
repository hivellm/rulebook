# rulebook - Development Guide

## Prerequisites

- Node.js 18+ (or language-specific tooling)
- Package manager (npm, pnpm, yarn)
- Git

## Setup

```bash
git clone <repository-url>
cd rulebook
npm install
```

## Quality Gates

- `npm run lint`
- `npm run type-check`
- `npm test`
- Coverage threshold: 95%

## Branch Strategy

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit with conventional commits
3. Open a pull request and request review

## Documentation Updates

- Update README.md for public-facing changes
- Document architecture changes in ARCHITECTURE.md
- Record roadmap updates in ROADMAP.md

---
*Last Updated: 2025-11-18*
