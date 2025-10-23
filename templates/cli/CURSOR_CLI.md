<!-- CURSOR_CLI:START -->
# Cursor CLI Rules

**CRITICAL**: Specific rules and patterns for Cursor AI in CLI mode / automation.

## Cursor CLI Overview

Cursor provides CLI access for automation and scripting:

```bash
# Using Cursor's composer/agent programmatically
# Via Cursor API or automation scripts
```

## Integration with AGENTS.md

### 1. Context File

Create `.cursor/context.md` in project root:

```markdown
# Project Context for Cursor

This project uses @hivellm/rulebook standards defined in AGENTS.md.

## Critical Standards

Read and follow AGENTS.md in project root for ALL code generation.

### Key Requirements
- Tests: 95%+ coverage minimum
- Quality: All checks must pass (type, lint, tests)
- Documentation: Update /docs/ with all changes
- Structure: Follow strict documentation layout from AGENTS.md

### Language-Specific
See AGENTS.md for:
- Rust: Edition 2024, clippy, testing
- TypeScript: ESLint, Prettier, Vitest
- Python: Ruff, Black, mypy, pytest

### Module Patterns
See AGENTS.md for:
- Vectorizer: Semantic search patterns
- Synap: KV store and task tracking
- OpenSpec: Proposal workflow
- Context7: Dependency management
```

### 2. Cursor Rules File

Create `.cursorrules` in project root:

```
This project follows @hivellm/rulebook standards.

CRITICAL RULES FROM AGENTS.md:
1. Read @AGENTS.md before ANY code generation
2. Write tests FIRST (95%+ coverage required)
3. Run quality checks before committing:
   - Type check / Compile
   - Linter (zero warnings)
   - All tests (100% pass)
   - Coverage verification
4. Update /docs/ with all changes
5. Follow language-specific patterns from @AGENTS.md

When implementing features:
1. Check @/docs/specs/ for specifications
2. Create tests in /tests/ first
3. Implement following @AGENTS.md patterns
4. Run all quality checks
5. Update @/docs/ROADMAP.md progress
6. Add @CHANGELOG.md entry

Always reference @AGENTS.md for:
- Code patterns
- Error handling
- Testing requirements
- Documentation standards
```

## Cursor API Usage

### 1. Batch Processing

```typescript
// Using Cursor's API for batch operations
import { CursorAPI } from '@cursor/api';

const cursor = new CursorAPI({
  apiKey: process.env.CURSOR_API_KEY
});

async function implementFeature(spec: string) {
  // Reference AGENTS.md in context
  const agentsContent = await fs.readFile('AGENTS.md', 'utf-8');
  
  const result = await cursor.agent({
    prompt: `Following these standards:\n\n${agentsContent}\n\nImplement: ${spec}`,
    files: [
      'src/feature.rs',
      'tests/feature.test.rs'
    ],
    context: [
      'AGENTS.md',
      'docs/specs/FEATURE.md'
    ]
  });
  
  return result;
}
```

### 2. Automated Code Review

```typescript
async function reviewCode(files: string[]) {
  const agentsContent = await fs.readFile('AGENTS.md', 'utf-8');
  
  const review = await cursor.review({
    files,
    standards: agentsContent,
    checks: [
      'error-handling',
      'test-coverage',
      'documentation',
      'code-quality'
    ]
  });
  
  return review;
}
```

### 3. Test Generation

```typescript
async function generateTests(sourceFile: string) {
  const source = await fs.readFile(sourceFile, 'utf-8');
  const agents = await fs.readFile('AGENTS.md', 'utf-8');
  
  const tests = await cursor.generate({
    type: 'tests',
    source,
    standards: agents,
    requirements: {
      coverage: 95,
      location: '/tests/',
      edgeCases: true,
      errorPaths: true
    }
  });
  
  return tests;
}
```

## CLI Automation Patterns

### 1. Feature Implementation Pipeline

```typescript
async function featurePipeline(spec: string) {
  console.log('📋 Reading project standards...');
  const standards = await fs.readFile('AGENTS.md', 'utf-8');
  
  console.log('🧪 Generating tests...');
  const tests = await cursor.agent({
    prompt: `${standards}\n\nCreate comprehensive tests for: ${spec}`,
    targetPath: 'tests/'
  });
  
  await writeFiles(tests);
  
  console.log('💻 Implementing feature...');
  const impl = await cursor.agent({
    prompt: `${standards}\n\nImplement feature to pass tests: ${spec}`,
    context: [
      '@AGENTS.md',
      '@tests/',
      '@docs/specs/'
    ]
  });
  
  await writeFiles(impl);
  
  console.log('✅ Running quality checks...');
  await runQualityChecks();
  
  console.log('📚 Updating documentation...');
  await updateDocs(spec);
  
  console.log('✨ Feature complete!');
}
```

### 2. Batch Refactoring

```typescript
async function refactorModule(modulePath: string, goal: string) {
  const files = await glob(`${modulePath}/**/*`);
  const agents = await fs.readFile('AGENTS.md', 'utf-8');
  
  for (const file of files) {
    console.log(`Refactoring ${file}...`);
    
    const refactored = await cursor.agent({
      prompt: `${agents}\n\nRefactor following AGENTS.md patterns:\nGoal: ${goal}`,
      files: [file],
      context: ['@AGENTS.md']
    });
    
    await writeFile(file, refactored);
    
    // Update corresponding tests
    const testFile = file.replace('src/', 'tests/').replace('.rs', '.test.rs');
    if (await fileExists(testFile)) {
      const updatedTests = await cursor.agent({
        prompt: `Update tests for refactored code following AGENTS.md`,
        files: [testFile, file],
        context: ['@AGENTS.md']
      });
      
      await writeFile(testFile, updatedTests);
    }
  }
  
  await runTests();
}
```

### 3. Documentation Generator

```typescript
async function generateDocs(sourceDir: string) {
  const files = await glob(`${sourceDir}/**/*`);
  const agents = await fs.readFile('AGENTS.md', 'utf-8');
  
  const docs = await cursor.agent({
    prompt: `${agents}\n\nGenerate comprehensive documentation following AGENTS.md standards`,
    files,
    outputType: 'markdown',
    requirements: [
      'API documentation',
      'Usage examples',
      'Error handling guide',
      'Architecture overview'
    ]
  });
  
  await writeFile('docs/API.md', docs);
}
```

## CI/CD Integration

### 1. Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🤖 Cursor AI: Reviewing changes..."

# Get changed files
CHANGED_FILES=$(git diff --cached --name-only)

# Run Cursor review
cursor-cli review \
  --files "$CHANGED_FILES" \
  --standards "AGENTS.md" \
  --strict

if [ $? -ne 0 ]; then
  echo "❌ Review failed. Fix issues before committing."
  exit 1
fi

echo "✅ Review passed!"
```

### 2. GitHub Actions Workflow

```yaml
name: Cursor AI Review

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  cursor-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Cursor CLI
        run: npm install -g @cursor/cli
      
      - name: Review PR
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: |
          cursor-cli review \
            --pr ${{ github.event.pull_request.number }} \
            --standards AGENTS.md \
            --report pr-review.md
      
      - name: Post Review
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('pr-review.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: review
            });
```

## Quality Assurance Automation

### 1. Automated Testing

```typescript
async function autoTest(files: string[]) {
  const agents = await fs.readFile('AGENTS.md', 'utf-8');
  
  for (const file of files) {
    // Generate tests
    const tests = await cursor.agent({
      prompt: `${agents}\n\nGenerate 95%+ coverage tests`,
      files: [file],
      outputPath: file.replace('src/', 'tests/')
    });
    
    await writeFile(tests.path, tests.content);
  }
  
  // Run tests
  const result = await exec('cargo test'); // or npm test, pytest
  
  if (!result.success) {
    // Fix failing tests
    const fixes = await cursor.agent({
      prompt: `${agents}\n\nTests failing:\n${result.output}\n\nFix implementation`,
      context: ['@AGENTS.md', '@tests/', '@src/']
    });
    
    await applyFixes(fixes);
  }
}
```

### 2. Coverage Checker

```typescript
async function ensureCoverage(threshold: number = 95) {
  const coverage = await runCoverage();
  
  if (coverage.percentage < threshold) {
    const agents = await fs.readFile('AGENTS.md', 'utf-8');
    
    const additionalTests = await cursor.agent({
      prompt: `${agents}\n\nCoverage is ${coverage.percentage}%, need ${threshold}%+\n\nAdd tests for uncovered code:\n${coverage.uncovered}`,
      context: ['@AGENTS.md', '@tests/']
    });
    
    await writeFiles(additionalTests);
    await runTests();
  }
}
```

## Best Practices

### 1. Always Include AGENTS.md

```typescript
// Good
const context = [
  '@AGENTS.md',
  '@docs/specs/',
  ...sourceFiles
];

// Bad
const context = sourceFiles;
```

### 2. Verify Before Committing

```typescript
async function verifyQuality() {
  const checks = [
    { name: 'Type Check', cmd: 'npm run type-check' },
    { name: 'Lint', cmd: 'npm run lint' },
    { name: 'Tests', cmd: 'npm test' },
    { name: 'Coverage', cmd: 'npm run test:coverage' }
  ];
  
  for (const check of checks) {
    console.log(`Running ${check.name}...`);
    const result = await exec(check.cmd);
    
    if (!result.success) {
      throw new Error(`${check.name} failed:\n${result.output}`);
    }
  }
}
```

### 3. Iterative Improvement

```typescript
async function implementUntilCorrect(spec: string, maxAttempts: number = 3) {
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    const impl = await cursor.agent({
      prompt: `${await fs.readFile('AGENTS.md')}\n\nImplement: ${spec}`,
      attempt: attempt + 1
    });
    
    await writeFiles(impl);
    
    const qualityCheck = await runQualityChecks();
    
    if (qualityCheck.allPassed) {
      return impl;
    }
    
    // Provide feedback for next iteration
    spec = `${spec}\n\nPrevious attempt had issues:\n${qualityCheck.issues}\n\nFix these following AGENTS.md`;
    attempt++;
  }
  
  throw new Error('Failed to implement correctly after max attempts');
}
```

## Tips for Better Results

1. **Context is Key**: Always include AGENTS.md in context
2. **Be Specific**: Reference exact sections of AGENTS.md
3. **Verify Output**: Run quality checks after generation
4. **Iterate**: Refine based on test/lint failures
5. **Document**: Update docs alongside code
6. **Automate**: Use CI/CD for consistent enforcement
7. **Review**: Always review AI-generated code

## Error Handling

```typescript
async function safeGenerate(prompt: string, retries: number = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await cursor.agent({ prompt });
      return result;
    } catch (error) {
      if (i === retries - 1) throw error;
      
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

<!-- CURSOR_CLI:END -->

