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
