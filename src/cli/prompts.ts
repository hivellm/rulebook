import inquirer from 'inquirer';
import type { DetectionResult, ProjectConfig } from '../types.js';

export async function promptProjectConfig(
  detection: DetectionResult
): Promise<ProjectConfig> {
  const questions = [];

  // Language selection
  if (detection.languages.length > 0) {
    const primaryLang = detection.languages[0];
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useDetected',
        message: `Detected ${primaryLang.language} project (confidence: ${(primaryLang.confidence * 100).toFixed(0)}%). Is this correct?`,
        default: true,
      },
    ]);

    if (!confirm.useDetected) {
      questions.push({
        type: 'checkbox',
        name: 'languages',
        message: 'Select the languages used in this project:',
        choices: [
          { name: 'Rust', value: 'rust' },
          { name: 'TypeScript', value: 'typescript' },
          { name: 'Python', value: 'python' },
          { name: 'Go', value: 'go' },
          { name: 'Java', value: 'java' },
        ],
        default: detection.languages.map((l) => l.language),
      });
    }
  } else {
    questions.push({
      type: 'checkbox',
      name: 'languages',
      message: 'Select the languages used in this project:',
      choices: [
        { name: 'Rust', value: 'rust' },
        { name: 'TypeScript', value: 'typescript' },
        { name: 'Python', value: 'python' },
        { name: 'Go', value: 'go' },
        { name: 'Java', value: 'java' },
      ],
      validate: (answer: string[]) => {
        if (answer.length < 1) {
          return 'You must select at least one language.';
        }
        return true;
      },
    });
  }

  // Project type
  questions.push({
    type: 'list',
    name: 'projectType',
    message: 'What type of project is this?',
    choices: [
      { name: 'Application', value: 'application' },
      { name: 'Library', value: 'library' },
      { name: 'CLI Tool', value: 'cli' },
      { name: 'Monorepo', value: 'monorepo' },
    ],
    default: 'application',
  });

  // Module selection
  const detectedModules = detection.modules.filter((m) => m.detected).map((m) => m.module);
  questions.push({
    type: 'checkbox',
    name: 'modules',
    message: 'Select MCP modules to include rules for:',
    choices: [
      { name: 'Vectorizer (semantic search)', value: 'vectorizer', checked: detectedModules.includes('vectorizer') },
      { name: 'Synap (key-value store)', value: 'synap', checked: detectedModules.includes('synap') },
      { name: 'OpenSpec (proposal system)', value: 'openspec', checked: detectedModules.includes('openspec') },
      { name: 'Context7 (library docs)', value: 'context7', checked: detectedModules.includes('context7') },
    ],
  });

  // IDE selection
  questions.push({
    type: 'checkbox',
    name: 'ides',
    message: 'Select IDEs/tools to generate rules for:',
    choices: [
      { name: 'Cursor', value: 'cursor' },
      { name: 'Windsurf', value: 'windsurf' },
      { name: 'VS Code', value: 'vscode' },
      { name: 'GitHub Copilot', value: 'copilot' },
    ],
    default: ['cursor'],
  });

  // Coverage threshold
  questions.push({
    type: 'number',
    name: 'coverageThreshold',
    message: 'Minimum test coverage percentage:',
    default: 95,
    validate: (value: number) => {
      if (value < 0 || value > 100) {
        return 'Coverage must be between 0 and 100.';
      }
      return true;
    },
  });

  // Documentation strictness
  questions.push({
    type: 'confirm',
    name: 'strictDocs',
    message: 'Enforce strict documentation structure (/docs only)?',
    default: true,
  });

  // Workflow generation
  questions.push({
    type: 'confirm',
    name: 'generateWorkflows',
    message: 'Generate GitHub Actions workflows?',
    default: true,
  });

  const answers = await inquirer.prompt(questions);

  return {
    languages: answers.languages || detection.languages.map((l) => l.language),
    modules: answers.modules || [],
    ides: answers.ides || ['cursor'],
    projectType: answers.projectType,
    coverageThreshold: answers.coverageThreshold,
    strictDocs: answers.strictDocs,
    generateWorkflows: answers.generateWorkflows,
  };
}

export async function promptMergeStrategy(): Promise<'merge' | 'replace'> {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'strategy',
      message: 'AGENTS.md already exists. How would you like to proceed?',
      choices: [
        {
          name: 'Merge - Add/update RULEBOOK block only (preserves existing content)',
          value: 'merge',
        },
        {
          name: 'Replace - Completely replace with new AGENTS.md (backup will be created)',
          value: 'replace',
        },
      ],
      default: 'merge',
    },
  ]);

  return answer.strategy;
}

