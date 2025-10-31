<!-- SERENA:START -->
# Serena MCP Instructions

**CRITICAL**: Use MCP Serena for AI-powered development assistance, code analysis, and intelligent automation.

## Core Operations

### Code Analysis
```typescript
// Analyze code quality
serena.analyze({
  file: 'src/auth/login.ts',
  checks: ['security', 'performance', 'best-practices']
})

// Get refactoring suggestions
serena.suggest({
  file: 'src/legacy-code.js',
  type: 'refactor',
  target: 'modern'
})

// Detect code smells
serena.detectSmells({
  directory: 'src/',
  severity: 'high'
})
```

### Code Generation
```typescript
// Generate tests
serena.generateTests({
  sourceFile: 'src/utils/validator.ts',
  framework: 'vitest',
  coverage: 'comprehensive'
})

// Generate documentation
serena.generateDocs({
  files: ['src/**/*.ts'],
  format: 'markdown',
  includeExamples: true
})

// Generate types
serena.generateTypes({
  from: 'api-schema.json',
  to: 'src/types/api.ts',
  style: 'strict'
})
```

### Intelligent Refactoring
```typescript
// Extract function
serena.refactor({
  action: 'extract-function',
  file: 'src/complex-logic.ts',
  selection: { start: 45, end: 78 },
  newFunctionName: 'processUserData'
})

// Rename symbol
serena.refactor({
  action: 'rename',
  symbol: 'oldFunctionName',
  newName: 'newFunctionName',
  scope: 'project'
})

// Convert to async
serena.refactor({
  action: 'convert-to-async',
  file: 'src/sync-operations.ts'
})
```

### Code Review
```typescript
// Get code review
serena.review({
  files: ['src/new-feature/**/*.ts'],
  focus: ['security', 'performance', 'maintainability'],
  severity: 'warning-and-above'
})

// Check best practices
serena.checkBestPractices({
  language: 'typescript',
  framework: 'react',
  files: 'src/components/**/*.tsx'
})
```

## Common Patterns

### Pre-Commit Analysis
```typescript
// Analyze changed files before commit
const changedFiles = execSync('git diff --cached --name-only').toString().split('\n')

for (const file of changedFiles) {
  const analysis = await serena.analyze({
    file,
    checks: ['security', 'performance', 'best-practices']
  })
  
  if (analysis.issues.filter(i => i.severity === 'high').length > 0) {
    console.error(`❌ High severity issues found in ${file}`)
    process.exit(1)
  }
}
```

### Test Generation Workflow
```typescript
// Generate tests for new features
const newFiles = findFilesWithoutTests('src/features/new-feature')

for (const file of newFiles) {
  const tests = await serena.generateTests({
    sourceFile: file,
    framework: 'vitest',
    coverage: 'comprehensive'
  })
  
  const testFile = file.replace('.ts', '.test.ts')
  fs.writeFileSync(testFile, tests.code)
  
  console.log(`✅ Generated tests for ${file}`)
}
```

### Code Quality Dashboard
```typescript
// Generate project health report
const files = glob.sync('src/**/*.ts')

const report = {
  totalFiles: files.length,
  issues: [],
  codeSmells: [],
  coverage: 0
}

for (const file of files) {
  const analysis = await serena.analyze({ file })
  report.issues.push(...analysis.issues)
  
  const smells = await serena.detectSmells({ file })
  report.codeSmells.push(...smells)
}

// Post to dashboard
await grafana.dashboards.updateDashboard({
  panels: [
    { title: 'Code Quality', value: calculateQualityScore(report) },
    { title: 'Issues', value: report.issues.length },
    { title: 'Code Smells', value: report.codeSmells.length }
  ]
})
```

### Automated Refactoring Pipeline
```typescript
// Identify and fix code smells automatically
const smells = await serena.detectSmells({
  directory: 'src/',
  severity: 'medium-and-above'
})

for (const smell of smells) {
  if (smell.autoFixable) {
    const result = await serena.refactor({
      action: smell.suggestedAction,
      file: smell.file,
      selection: smell.location
    })
    
    if (result.success) {
      console.log(`✅ Fixed: ${smell.description}`)
    }
  }
}
```

### Documentation Sync
```typescript
// Keep documentation in sync with code
const apiFiles = glob.sync('src/api/**/*.ts')

for (const file of apiFiles) {
  const docs = await serena.generateDocs({
    files: [file],
    format: 'markdown',
    includeExamples: true
  })
  
  const docFile = `docs/api/${path.basename(file, '.ts')}.md`
  fs.writeFileSync(docFile, docs)
}

// Update CHANGELOG with AI summary
const changes = execSync('git log --oneline --since="1 week ago"').toString()
const summary = await serena.summarize({
  text: changes,
  format: 'changelog',
  categorize: true
})

updateChangelog(summary)
```

### Intelligent Code Migration
```typescript
// Migrate from old to new API
await serena.migrate({
  from: 'old-api-v1',
  to: 'new-api-v2',
  files: 'src/**/*.ts',
  strategy: 'safe',  // safe, aggressive, manual
  createBackup: true
})

// Update imports
await serena.refactor({
  action: 'update-imports',
  from: '@old-package',
  to: '@new-package',
  scope: 'project'
})
```

## Best Practices

✅ **DO:**
- Run analysis before commits
- Generate tests for new code
- Use AI suggestions as starting point
- Review generated code before accepting
- Keep AI-generated docs in sync
- Use for repetitive refactoring tasks
- Leverage for code review automation

❌ **DON'T:**
- Blindly accept all suggestions
- Skip manual code review
- Use for critical security decisions
- Ignore high-severity issues
- Over-rely on automation
- Skip testing generated code

## Configuration

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-serena"],
      "env": {
        "SERENA_API_KEY": "your-api-key",
        "SERENA_MODEL": "gpt-4",
        "SERENA_TEMPERATURE": "0.2"
      }
    }
  }
}
```

**Configuration Options:**
- `SERENA_MODEL`: AI model to use (gpt-4, claude-3, etc.)
- `SERENA_TEMPERATURE`: Creativity level (0.0-1.0, lower = more deterministic)
- `SERENA_MAX_TOKENS`: Maximum response length
- `SERENA_TIMEOUT`: Request timeout in seconds

## Integration with AGENT_AUTOMATION

Enhance automation workflow with AI assistance:

```typescript
// Step 1: AI-powered code review before quality checks
const review = await serena.review({
  files: changedFiles,
  focus: ['security', 'performance']
})

if (review.criticalIssues.length > 0) {
  console.error('Critical issues found. Fix before proceeding.')
  process.exit(1)
}

// Step 2: Generate missing tests
const filesWithoutTests = findFilesWithoutTests()
for (const file of filesWithoutTests) {
  await serena.generateTests({ sourceFile: file })
}

// Step 3: Normal AGENT_AUTOMATION workflow
// (lint, test, coverage, etc.)

// Step 4: AI-powered commit message
const commitMessage = await serena.generateCommitMessage({
  diff: execSync('git diff --cached').toString(),
  style: 'conventional'
})

git commit -m "${commitMessage}"
```

## CI/CD Integration

```yaml
# .github/workflows/serena-review.yml
name: AI Code Review

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: AI Code Review
        run: |
          npx serena review \
            --files="$(git diff --name-only origin/main)" \
            --severity=warning \
            --format=github-comment
        env:
          SERENA_API_KEY: ${{ secrets.SERENA_API_KEY }}
```

<!-- SERENA:END -->

