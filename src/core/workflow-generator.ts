import path from 'path';
import { readFile, writeFile, ensureDir, fileExists } from '../utils/file-system.js';
import type { ProjectConfig } from '../types.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getTemplatesDir(): string {
  return path.join(__dirname, '..', '..', 'templates');
}

export async function generateWorkflows(
  config: ProjectConfig,
  targetDir: string = process.cwd(),
  options: { mode?: 'full' | 'minimal' } = {}
): Promise<string[]> {
  const generatedFiles: string[] = [];
  const workflowsDir = path.join(targetDir, '.github', 'workflows');
  await ensureDir(workflowsDir);

  const templatesDir = path.join(getTemplatesDir(), 'workflows');
  const mode = options.mode ?? 'full';

  // Generate language-specific workflows
  for (const language of config.languages) {
    if (language === 'rust') {
      // Copy Rust workflows
      const rustTest = await copyWorkflow(templatesDir, 'rust-test.yml', workflowsDir);
      generatedFiles.push(rustTest);
      if (mode === 'full') {
        const rustLint = await copyWorkflow(templatesDir, 'rust-lint.yml', workflowsDir);
        generatedFiles.push(rustLint);
      }
    } else if (language === 'typescript') {
      // Copy TypeScript workflows
      const tsTest = await copyWorkflow(templatesDir, 'typescript-test.yml', workflowsDir);
      generatedFiles.push(tsTest);
      if (mode === 'full') {
        const tsLint = await copyWorkflow(templatesDir, 'typescript-lint.yml', workflowsDir);
        generatedFiles.push(tsLint);
      }
    } else if (language === 'python') {
      // Copy Python workflows
      const pyTest = await copyWorkflow(templatesDir, 'python-test.yml', workflowsDir);
      generatedFiles.push(pyTest);
      if (mode === 'full') {
        const pyLint = await copyWorkflow(templatesDir, 'python-lint.yml', workflowsDir);
        generatedFiles.push(pyLint);
      }
    } else if (language === 'go') {
      // Copy Go workflows
      const goTest = await copyWorkflow(templatesDir, 'go-test.yml', workflowsDir);
      generatedFiles.push(goTest);
      if (mode === 'full') {
        const goLint = await copyWorkflow(templatesDir, 'go-lint.yml', workflowsDir);
        generatedFiles.push(goLint);
      }
    } else if (language === 'java') {
      // Copy Java workflows
      const javaTest = await copyWorkflow(templatesDir, 'java-test.yml', workflowsDir);
      generatedFiles.push(javaTest);
      if (mode === 'full') {
        const javaLint = await copyWorkflow(templatesDir, 'java-lint.yml', workflowsDir);
        generatedFiles.push(javaLint);
      }
    }
  }

  if (mode === 'full') {
    // Always add codespell in full mode
    const codespell = await copyWorkflow(templatesDir, 'codespell.yml', workflowsDir);
    generatedFiles.push(codespell);
  }

  return generatedFiles;
}

async function copyWorkflow(
  templatesDir: string,
  workflowFile: string,
  targetDir: string
): Promise<string> {
  const sourcePath = path.join(templatesDir, workflowFile);
  const targetPath = path.join(targetDir, workflowFile);

  // Check if workflow already exists
  if (await fileExists(targetPath)) {
    // Skip if exists, don't overwrite
    return targetPath;
  }

  const content = await readFile(sourcePath);
  await writeFile(targetPath, content);

  return targetPath;
}

export async function generateIDEFiles(
  config: ProjectConfig,
  targetDir: string = process.cwd()
): Promise<string[]> {
  const generatedFiles: string[] = [];

  for (const ide of config.ides) {
    if (ide === 'cursor') {
      const cursorRulesPath = await generateCursorRules(config, targetDir);
      if (cursorRulesPath) generatedFiles.push(cursorRulesPath);
      // Generate Cursor commands
      const cursorCommands = await generateCursorCommands(targetDir);
      generatedFiles.push(...cursorCommands);
    } else if (ide === 'windsurf') {
      const windsurfRulesPath = await generateWindsurfRules(config, targetDir);
      if (windsurfRulesPath) generatedFiles.push(windsurfRulesPath);
    } else if (ide === 'vscode') {
      const vscodeFiles = await generateVSCodeConfig(config, targetDir);
      generatedFiles.push(...vscodeFiles);
    } else if (ide === 'copilot') {
      const copilotPath = await generateCopilotInstructions(config, targetDir);
      if (copilotPath) generatedFiles.push(copilotPath);
    }
  }

  return generatedFiles;
}

async function generateCursorRules(
  config: ProjectConfig,
  targetDir: string
): Promise<string | null> {
  const targetPath = path.join(targetDir, '.cursorrules');

  // Don't overwrite if exists
  if (await fileExists(targetPath)) {
    return null;
  }

  const content = `This project uses @hivellm/rulebook standards.

CRITICAL RULES:
1. Always reference @AGENTS.md before coding
2. Write tests first (${config.coverageThreshold}%+ coverage required)
3. Run quality checks before committing:
   - Type check / Compiler check
   - Linter (no warnings allowed)
   - All tests (100% pass rate)
   - Coverage check
4. Update docs/ when implementing features
5. Follow strict documentation structure

Language-specific rules are in @AGENTS.md.
Module-specific patterns are in @AGENTS.md.

When in doubt, ask to review @AGENTS.md first.
`;

  await writeFile(targetPath, content);
  return targetPath;
}

async function generateWindsurfRules(
  config: ProjectConfig,
  targetDir: string
): Promise<string | null> {
  const targetPath = path.join(targetDir, '.windsurfrules');

  if (await fileExists(targetPath)) {
    return null;
  }

  const content = `# Project Standards

This project uses @hivellm/rulebook for standardization.

## Critical Rules

1. **Always check @AGENTS.md** before generating code
2. **Tests first**: Minimum ${config.coverageThreshold}% coverage required
3. **Quality gates**: All must pass before commit
   - Type checking
   - Linting (zero warnings)
   - All tests (100% pass)
   - Coverage verification
4. **Documentation**: Update /docs/ with all changes
5. **Structure**: Follow strict documentation layout

## Language Rules

See @AGENTS.md for:
${config.languages.map((lang) => `- ${lang.charAt(0).toUpperCase() + lang.slice(1)}: Language-specific standards`).join('\n')}

## Module Patterns

${config.modules.length > 0 ? `See @AGENTS.md for:\n${config.modules.map((mod) => `- ${mod.charAt(0).toUpperCase() + mod.slice(1)}: Module-specific patterns`).join('\n')}` : 'No modules configured'}
`;

  await writeFile(targetPath, content);
  return targetPath;
}

async function generateVSCodeConfig(config: ProjectConfig, targetDir: string): Promise<string[]> {
  const vscodeDir = path.join(targetDir, '.vscode');
  await ensureDir(vscodeDir);

  const generatedFiles: string[] = [];

  // Generate settings.json
  const settingsPath = path.join(vscodeDir, 'settings.json');
  if (!(await fileExists(settingsPath))) {
    const settings = {
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': {
        'source.fixAll.eslint': true,
        'source.organizeImports': true,
      },
      'editor.rulers': [100],
      'files.eol': '\n',
      'github.copilot.enable': {
        '*': true,
      },
    };

    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    generatedFiles.push(settingsPath);
  }

  // Generate copilot-instructions.md
  const copilotPath = path.join(vscodeDir, 'copilot-instructions.md');
  if (!(await fileExists(copilotPath))) {
    const instructions = `# GitHub Copilot Instructions

This project follows @hivellm/rulebook standards defined in AGENTS.md.

Read and follow AGENTS.md for all code generation.

Minimum test coverage: ${config.coverageThreshold}%
`;

    await writeFile(copilotPath, instructions);
    generatedFiles.push(copilotPath);
  }

  return generatedFiles;
}

async function generateCopilotInstructions(
  config: ProjectConfig,
  targetDir: string
): Promise<string | null> {
  const githubDir = path.join(targetDir, '.github');
  await ensureDir(githubDir);

  const targetPath = path.join(githubDir, 'copilot-instructions.md');

  if (await fileExists(targetPath)) {
    return null;
  }

  const content = `# GitHub Copilot Instructions

This project follows @hivellm/rulebook standards defined in AGENTS.md.

## Code Generation Rules

1. **Always follow AGENTS.md** for all code generation
2. **Tests required**: Minimum ${config.coverageThreshold}% coverage for all new code
3. **Quality checks**: Code must pass all checks before commit:
   - Type checking / Compilation
   - Linting (zero warnings)
   - All tests passing
   - Coverage threshold met
4. **Documentation**: Update /docs/ with all changes
5. **Structure**: Follow project structure from AGENTS.md

## Language-Specific Standards

${config.languages.map((lang) => `### ${lang.charAt(0).toUpperCase() + lang.slice(1)}\nSee AGENTS.md for ${lang} standards`).join('\n\n')}

## Testing Patterns

- Tests in /tests directory
- Test-driven development
- Edge cases and error paths
- Integration tests where appropriate
`;

  await writeFile(targetPath, content);
  return targetPath;
}

/**
 * Generate Cursor commands from templates
 */
export async function generateCursorCommands(targetDir: string): Promise<string[]> {
  const commandsDir = path.join(targetDir, '.cursor', 'commands');
  await ensureDir(commandsDir);

  const templatesDir = path.join(getTemplatesDir(), 'commands');
  const generatedFiles: string[] = [];

  // List of command templates to copy
  const commandTemplates = [
    'rulebook-task-create.md',
    'rulebook-task-list.md',
    'rulebook-task-show.md',
    'rulebook-task-validate.md',
    'rulebook-task-archive.md',
    'rulebook-task-apply.md',
  ];

  for (const template of commandTemplates) {
    const sourcePath = path.join(templatesDir, template);
    const targetPath = path.join(commandsDir, template);

    // Skip if already exists (don't overwrite user customizations)
    if (await fileExists(targetPath)) {
      continue;
    }

    // Check if template exists
    if (await fileExists(sourcePath)) {
      const content = await readFile(sourcePath);
      await writeFile(targetPath, content);
      generatedFiles.push(targetPath);
    }
  }

  return generatedFiles;
}

/**
 * Generate AI CLI configuration files (CLAUDE.md, CODEX.md, GEMINI.md, gemini-extension.json)
 * These files help AI CLI tools understand project standards
 */
export async function generateAICLIFiles(
  config: ProjectConfig,
  targetDir: string = process.cwd()
): Promise<string[]> {
  const generatedFiles: string[] = [];

  // Generate CLAUDE.md for Claude Code CLI
  const claudePath = path.join(targetDir, 'CLAUDE.md');
  if (!(await fileExists(claudePath))) {
    const claudeContent = generateClaudeMdContent(config);
    await writeFile(claudePath, claudeContent);
    generatedFiles.push(claudePath);
  }

  // Generate CODEX.md for Codex CLI
  const codexPath = path.join(targetDir, 'CODEX.md');
  if (!(await fileExists(codexPath))) {
    const codexContent = generateCodexMdContent(config);
    await writeFile(codexPath, codexContent);
    generatedFiles.push(codexPath);
  }

  // Generate GEMINI.md for Gemini CLI
  const geminiPath = path.join(targetDir, 'GEMINI.md');
  if (!(await fileExists(geminiPath))) {
    const geminiContent = generateGeminiMdContent(config);
    await writeFile(geminiPath, geminiContent);
    generatedFiles.push(geminiPath);
  }

  // Generate gemini-extension.json for Gemini CLI extension
  const geminiExtPath = path.join(targetDir, 'gemini-extension.json');
  if (!(await fileExists(geminiExtPath))) {
    const geminiExtContent = generateGeminiExtensionContent(config, targetDir);
    await writeFile(geminiExtPath, JSON.stringify(geminiExtContent, null, 2));
    generatedFiles.push(geminiExtPath);
  }

  return generatedFiles;
}

function generateClaudeMdContent(config: ProjectConfig): string {
  const languages = config.languages.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ');
  return `# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

This project uses @hivehub/rulebook standards. All code generation should follow the rules defined in AGENTS.md.

**Languages**: ${languages || 'Not specified'}
**Coverage Threshold**: ${config.coverageThreshold}%

## ⚠️ CRITICAL: File Editing Rules

**MANDATORY**: When editing multiple files, you MUST edit files **SEQUENTIALLY**, one at a time.

### Why Sequential Editing is Required

The Edit tool uses exact string matching for replacements. When multiple files are edited in parallel:
- The tool may fail to find the exact string in some files
- Race conditions can cause partial or corrupted edits
- Error recovery becomes impossible

### Correct Pattern

\`\`\`
✅ CORRECT (Sequential):
1. Edit file A → Wait for confirmation
2. Edit file B → Wait for confirmation
3. Edit file C → Wait for confirmation

❌ WRONG (Parallel):
1. Edit files A, B, C simultaneously → Failures likely
\`\`\`

### Implementation Rules

1. **NEVER call multiple Edit tools in parallel** for different files
2. **ALWAYS wait for each edit to complete** before starting the next
3. **Verify each edit succeeded** before proceeding
4. **If an edit fails**, retry that specific edit before moving on

## ⚠️ CRITICAL: Test Implementation Rules

**MANDATORY**: You MUST write **complete, production-quality tests**. Never simplify or reduce test coverage.

### Forbidden Test Patterns

\`\`\`typescript
// ❌ NEVER do this - placeholder tests
it('should work', () => {
  expect(true).toBe(true);
});

// ❌ NEVER do this - skipped tests
it.skip('should handle edge case', () => {});

// ❌ NEVER do this - incomplete assertions
it('should return data', () => {
  const result = getData();
  expect(result).toBeDefined(); // Too weak!
});

// ❌ NEVER do this - "simplify" by removing test cases
// Original had 10 test cases, don't reduce to 3
\`\`\`

### Required Test Patterns

\`\`\`typescript
// ✅ CORRECT - complete test with proper assertions
it('should return user data with correct structure', () => {
  const result = getUserById(1);
  expect(result).toEqual({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: expect.any(Date),
  });
});

// ✅ CORRECT - test edge cases and error paths
it('should throw NotFoundError when user does not exist', () => {
  expect(() => getUserById(999)).toThrow(NotFoundError);
});
\`\`\`

### Test Implementation Rules

1. **NEVER simplify tests** - Implement the full, complete test as originally designed
2. **NEVER skip test cases** - Every test case in the spec must be implemented
3. **NEVER use placeholder assertions** - Each assertion must verify actual behavior
4. **ALWAYS test error paths** - Exceptions, edge cases, and failure modes
5. **ALWAYS maintain coverage** - Tests must achieve the project's coverage threshold (${config.coverageThreshold}%+)

## Critical Rules

1. **ALWAYS read AGENTS.md first** - Contains all project standards and patterns
2. **Edit files sequentially** - One at a time, verify each edit
3. **Write complete tests** - No placeholders, no simplifications
4. **Tests required** - Minimum ${config.coverageThreshold}% coverage for all new code
5. **Quality checks before committing**:
   - Type check / Compiler check
   - Lint (zero warnings)
   - All tests passing
   - Coverage threshold met
6. **Documentation** - Update /docs/ when implementing features

## Persistent Memory

This project uses a **persistent memory system** via the Rulebook MCP server.
Memory persists across sessions — use it to maintain context between conversations.

**MANDATORY: You MUST actively use memory to preserve context across sessions.**

### Auto-Capture

Tool interactions (task create/update/archive, skill enable/disable) are auto-captured.
But you MUST also manually save important context:

- **Architectural decisions** — why you chose one approach over another
- **Bug fixes** — root cause and resolution
- **Discoveries** — codebase patterns, gotchas, constraints
- **Feature implementations** — what was built, key design choices
- **User preferences** — coding style, conventions, workflow preferences
- **Session summaries** — what was accomplished, what's pending

### Memory Commands (MCP)

\`\`\`
rulebook_memory_save    — Save context (type, title, content, tags)
rulebook_memory_search  — Search past context (query, mode: hybrid/bm25/vector)
rulebook_memory_get     — Get full details by ID
rulebook_memory_timeline — Chronological context around a memory
rulebook_memory_stats   — Database stats
rulebook_memory_cleanup — Evict old memories
\`\`\`

### Session Workflow

1. **Start of session**: \`rulebook_memory_search\` for relevant past context
2. **During work**: Save decisions, bugs, discoveries as they happen
3. **End of session**: Save a summary with \`type: observation\`

## Commands

\`\`\`bash
# Quality checks
npm run type-check    # TypeScript type checking
npm run lint          # Run linter
npm test              # Run tests
npm run build         # Build project

# Task management (if using Rulebook)
rulebook task list    # List tasks
rulebook task show    # Show task details
rulebook validate     # Validate project structure
\`\`\`

## File Structure

- \`AGENTS.md\` - Main project standards and AI directives
- \`/rulebook/\` - Modular rule definitions
- \`/docs/\` - Project documentation
- \`/tests/\` - Test files

When in doubt, check AGENTS.md for guidance.
`;
}

function generateCodexMdContent(config: ProjectConfig): string {
  const languages = config.languages.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ');
  return `# CODEX.md

Instructions for OpenAI Codex and compatible tools.

## Project Standards

This project uses @hivehub/rulebook. Follow AGENTS.md for all code generation.

**Languages**: ${languages || 'Not specified'}
**Test Coverage**: ${config.coverageThreshold}%+

## Rules

1. Read AGENTS.md before generating code
2. Write tests first (TDD approach)
3. Maintain ${config.coverageThreshold}%+ test coverage
4. Run quality checks before committing
5. Follow language-specific patterns from AGENTS.md

## Quick Reference

- Standards: See AGENTS.md
- Modular rules: See /rulebook/ directory
- Documentation: See /docs/ directory
- Tests: See /tests/ directory

Always reference AGENTS.md for consistent code generation.
`;
}

function generateGeminiMdContent(config: ProjectConfig): string {
  const languages = config.languages.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ');
  return `# GEMINI.md

Instructions for Google Gemini CLI and API.

## Project Configuration

This project uses @hivehub/rulebook standards defined in AGENTS.md.

**Languages**: ${languages || 'Not specified'}
**Coverage Requirement**: ${config.coverageThreshold}%

## Development Guidelines

1. **Check AGENTS.md first** - Contains all project standards
2. **Test-driven development** - Write tests before implementation
3. **Quality gates** - All code must pass:
   - Type checking
   - Linting (zero warnings)
   - Tests (100% pass rate)
   - Coverage (${config.coverageThreshold}%+)
4. **Documentation** - Update /docs/ for all features

## Project Structure

- \`AGENTS.md\` - AI agent directives and standards
- \`/rulebook/\` - Modular rule definitions
- \`/docs/\` - Documentation
- \`/tests/\` - Test files

For detailed standards, see AGENTS.md.
`;
}

function generateGeminiExtensionContent(
  config: ProjectConfig,
  targetDir: string
): Record<string, unknown> {
  return {
    name: path.basename(targetDir),
    version: '1.0.0',
    description: 'Gemini CLI extension for project standards',
    main: 'GEMINI.md',
    includes: ['AGENTS.md', 'rulebook/**/*.md', 'docs/**/*.md'],
    excludes: ['node_modules/**', 'dist/**', '.git/**'],
    settings: {
      coverageThreshold: config.coverageThreshold,
      languages: config.languages,
      frameworks: config.frameworks || [],
      strictMode: true,
    },
  };
}
