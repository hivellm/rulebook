import path from 'path';
import { writeFile, ensureDir, fileExists } from '../utils/file-system.js';

export interface DocsConfig {
  projectName: string;
  description: string;
  author: string;
  email?: string;
  license: string;
}

export async function generateDocsStructure(
  config: DocsConfig,
  targetDir: string = process.cwd(),
  mode: 'full' | 'minimal' = 'full'
): Promise<string[]> {
  const generatedFiles: string[] = [];

  // Create /docs directory structure
  const docsDir = path.join(targetDir, 'docs');
  await ensureDir(docsDir);
  await ensureDir(path.join(docsDir, 'specs'));
  await ensureDir(path.join(docsDir, 'guides'));
  await ensureDir(path.join(docsDir, 'diagrams'));
  await ensureDir(path.join(docsDir, 'benchmarks'));
  await ensureDir(path.join(docsDir, 'versions'));
  await ensureDir(path.join(docsDir, 'examples'));

  // Generate root README (concise version)
  const readmePath = path.join(targetDir, 'README.md');
  if (!(await fileExists(readmePath))) {
    const readmeContent = generateRootReadme(config, mode);
    await writeFile(readmePath, readmeContent);
    generatedFiles.push(readmePath);
  }

  // Generate ROADMAP.md
  const roadmapPath = path.join(docsDir, 'ROADMAP.md');
  if (!(await fileExists(roadmapPath))) {
    const roadmap = generateRoadmap(config);
    await writeFile(roadmapPath, roadmap);
    generatedFiles.push(roadmapPath);
  }

  // Generate ARCHITECTURE.md
  const archPath = path.join(docsDir, 'ARCHITECTURE.md');
  if (!(await fileExists(archPath))) {
    const architecture = generateArchitecture(config);
    await writeFile(archPath, architecture);
    generatedFiles.push(archPath);
  }

  // Generate DEVELOPMENT.md
  const developmentPath = path.join(docsDir, 'DEVELOPMENT.md');
  if (!(await fileExists(developmentPath))) {
    const development = generateDevelopment(config);
    await writeFile(developmentPath, development);
    generatedFiles.push(developmentPath);
  }

  if (mode === 'full') {
    // Generate DAG.md
    const dagPath = path.join(docsDir, 'DAG.md');
    if (!(await fileExists(dagPath))) {
      const dag = generateDAG(config);
      await writeFile(dagPath, dag);
      generatedFiles.push(dagPath);
    }

    // Generate CONTRIBUTING.md
    const contributingPath = path.join(targetDir, 'CONTRIBUTING.md');
    if (!(await fileExists(contributingPath))) {
      const contributing = generateContributing(config);
      await writeFile(contributingPath, contributing);
      generatedFiles.push(contributingPath);
    }

    // Generate CODE_OF_CONDUCT.md
    const cocPath = path.join(targetDir, 'CODE_OF_CONDUCT.md');
    if (!(await fileExists(cocPath))) {
      const coc = generateCodeOfConduct(config);
      await writeFile(cocPath, coc);
      generatedFiles.push(cocPath);
    }

    // Generate SECURITY.md
    const securityPath = path.join(targetDir, 'SECURITY.md');
    if (!(await fileExists(securityPath))) {
      const security = generateSecurity(config);
      await writeFile(securityPath, security);
      generatedFiles.push(securityPath);
    }
  }

  return generatedFiles;
}

function generateRootReadme(config: DocsConfig, mode: 'full' | 'minimal'): string {
  const documentationLinks = [
    '- [Architecture](docs/ARCHITECTURE.md)',
    '- [Development Guide](docs/DEVELOPMENT.md)',
    '- [Roadmap](docs/ROADMAP.md)',
  ];

  if (mode === 'full') {
    documentationLinks.push('- [Component DAG](docs/DAG.md)');
  }

  const communityLinks = [] as string[];
  if (mode === 'full') {
    communityLinks.push('- [Contributing](CONTRIBUTING.md)');
    communityLinks.push('- [Code of Conduct](CODE_OF_CONDUCT.md)');
    communityLinks.push('- [Security Policy](SECURITY.md)');
  }

  return `# ${config.projectName}

> ${config.description}

## Quick Start

1. Install dependencies
2. Run tests and linting
3. Start the application or run your CI pipeline

## Commands to Know

- \`npm install\`
- \`npm test\`
- \`npm run lint\`

## Documentation

${documentationLinks.join('\n')}

${
  communityLinks.length > 0
    ? `## Community & Support

${communityLinks.join('\n')}

`
    : ''
}## License

This project is licensed under the ${config.license} License.
`;
}

function generateRoadmap(config: DocsConfig): string {
  return `# ${config.projectName} - Roadmap

## Overview

This document outlines the development roadmap for ${config.projectName}.

## Phase 1: Foundation

- [ ] Core implementation
- [ ] Basic features
- [ ] Initial testing
- [ ] Documentation setup

## Phase 2: Features

- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

## Phase 3: Polish & Release

- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation completion
- [ ] Release v1.0.0

## Future Enhancements

### v2.0.0
- [ ] Advanced features
- [ ] Extended capabilities
- [ ] Enterprise support

## Metrics

- **Current Version**: 0.1.0
- **Test Coverage**: Target 95%+
- **Documentation**: In Progress

## Timeline

- **Phase 1**: Q1 2024
- **Phase 2**: Q2 2024
- **Phase 3**: Q3 2024
- **v2.0.0**: Q4 2024

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
}

function generateArchitecture(config: DocsConfig): string {
  return `# ${config.projectName} - Architecture

## Overview

This document describes the system architecture of ${config.projectName}.

## System Components

### Core Modules

1. **Module A**
   - Responsibility: [Description]
   - Key Functions: [List]
   - Dependencies: [List]

2. **Module B**
   - Responsibility: [Description]
   - Key Functions: [List]
   - Dependencies: [List]

## Data Flow

\`\`\`
[Input] → [Processing] → [Output]
\`\`\`

## Technology Stack

- **Language**: [Primary Language]
- **Framework**: [If applicable]
- **Database**: [If applicable]
- **Tools**: [Build tools, linters, etc.]

## Design Patterns

- Pattern 1: [Description]
- Pattern 2: [Description]

## Security Considerations

- Authentication: [Method]
- Authorization: [Method]
- Data Protection: [Method]

## Performance

- Expected Throughput: [Metrics]
- Latency: [Targets]
- Scalability: [Approach]

## Future Enhancements

- Enhancement 1
- Enhancement 2

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
}

function generateDAG(config: DocsConfig): string {
  return `# ${config.projectName} - Component Dependencies (DAG)

## Overview

This document describes the dependency graph (DAG) between components in ${config.projectName}.

## Component Graph

\`\`\`
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
\`\`\`

## Dependency Rules

1. **No Circular Dependencies**: Components must form a DAG
2. **Layer Separation**: Higher layers depend on lower layers only
3. **Interface Boundaries**: Use interfaces for cross-component communication

## Layer Architecture

### Layer 1: Foundation
- Utils
- Types
- Config

### Layer 2: Core
- Core logic
- Data models
- Base services

### Layer 3: Features
- Feature implementations
- Business logic
- API endpoints

### Layer 4: Presentation
- UI components
- CLI interface
- API controllers

## Verification

Run dependency check:
\`\`\`bash
# Add your dependency check command here
\`\`\`

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
}

function generateContributing(config: DocsConfig): string {
  return `# Contributing to ${config.projectName}

Thank you for your interest in contributing to ${config.projectName}!

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to ${config.email || 'the maintainers'}.

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
2. **Create a branch**: \`git checkout -b feature/my-feature\`
3. **Make changes**: Follow coding standards from AGENTS.md
4. **Write tests**: Ensure 95%+ coverage
5. **Run quality checks**:
   \`\`\`bash
   npm run type-check
   npm run lint
   npm test
   npm run test:coverage
   \`\`\`
6. **Commit**: Use conventional commits
7. **Push**: \`git push origin feature/my-feature\`
8. **Create PR**: Describe changes clearly

## Development Setup

\`\`\`bash
# Clone repository
git clone https://github.com/hivellm/${config.projectName}.git
cd ${config.projectName}

# Install dependencies
npm install

# Run development mode
npm run dev

# Run tests
npm test
\`\`\`

## Coding Standards

- Follow AGENTS.md standards
- Write tests for all new code (95%+ coverage)
- Document public APIs
- Use TypeScript strict mode
- Format with Prettier
- Lint with ESLint

## Commit Message Format

Use conventional commits:

\`\`\`
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
chore: update dependencies
\`\`\`

## Review Process

1. Automated checks must pass (CI/CD)
2. Code review by maintainer
3. Address feedback
4. Approval and merge

## License

By contributing, you agree that your contributions will be licensed under the ${config.license} License.

---
*For questions, contact ${config.email || config.author}*
`;
}

function generateCodeOfConduct(config: DocsConfig): string {
  return `# Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in ${config.projectName} a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

## Our Standards

Examples of behavior that contributes to a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior:

- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

## Enforcement Responsibilities

Project maintainers are responsible for clarifying and enforcing standards of acceptable behavior and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

## Scope

This Code of Conduct applies within all community spaces, and also applies when an individual is officially representing the community in public spaces.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to ${config.email || config.author}. All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the Contributor Covenant, version 2.1.

---
*For questions, contact ${config.email || config.author}*
`;
}

function generateSecurity(config: DocsConfig): string {
  return `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :x:                |
| < 0.2   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to ${config.email || config.author}.

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

## What to Include

Please include the following information:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release new versions ASAP

## Security Update Process

Security updates will be released as:

- **Critical**: Within 24 hours
- **High**: Within 7 days
- **Medium**: Within 30 days
- **Low**: Next regular release

## Comments

We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

---
*For security concerns, contact ${config.email || config.author}*
`;
}

function generateDevelopment(config: DocsConfig): string {
  return `# ${config.projectName} - Development Guide

## Prerequisites

- Node.js 18+ (or language-specific tooling)
- Package manager (npm, pnpm, yarn)
- Git

## Setup

\`\`\`bash
git clone <repository-url>
cd ${config.projectName}
npm install
\`\`\`

## Quality Gates

- \`npm run lint\`
- \`npm run type-check\`
- \`npm test\`
- Coverage threshold: 95%

## Branch Strategy

1. Create feature branch: \`git checkout -b feature/my-feature\`
2. Commit with conventional commits
3. Open a pull request and request review

## Documentation Updates

- Update README.md for public-facing changes
- Document architecture changes in ARCHITECTURE.md
- Record roadmap updates in ROADMAP.md

---
*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;
}
