import inquirer from 'inquirer';
import type { DetectionResult, ProjectConfig, FrameworkId } from '../types.js';

const FRAMEWORK_LABELS: Record<FrameworkId, string> = {
  nestjs: 'NestJS',
  spring: 'Spring Boot',
  laravel: 'Laravel',
  angular: 'Angular',
  react: 'React',
  vue: 'Vue.js',
  nuxt: 'Nuxt',
  django: 'Django',
  rails: 'Ruby on Rails',
  flask: 'Flask',
  symfony: 'Symfony',
  zend: 'Zend Framework',
  jquery: 'jQuery',
  reactnative: 'React Native',
  flutter: 'Flutter',
};

const LANGUAGE_CHOICES: Array<{ name: string; value: string }> = [
  { name: 'Ada', value: 'ada' },
  { name: 'C', value: 'c' },
  { name: 'C#', value: 'csharp' },
  { name: 'C++', value: 'cpp' },
  { name: 'Dart', value: 'dart' },
  { name: 'Elixir', value: 'elixir' },
  { name: 'Erlang', value: 'erlang' },
  { name: 'Go', value: 'go' },
  { name: 'Haskell', value: 'haskell' },
  { name: 'Java', value: 'java' },
  { name: 'JavaScript', value: 'javascript' },
  { name: 'Julia', value: 'julia' },
  { name: 'Kotlin', value: 'kotlin' },
  { name: 'Lisp', value: 'lisp' },
  { name: 'Lua', value: 'lua' },
  { name: 'Objective-C', value: 'objectivec' },
  { name: 'PHP', value: 'php' },
  { name: 'Python', value: 'python' },
  { name: 'R', value: 'r' },
  { name: 'Ruby', value: 'ruby' },
  { name: 'Rust', value: 'rust' },
  { name: 'SAS', value: 'sas' },
  { name: 'Scala', value: 'scala' },
  { name: 'Solidity', value: 'solidity' },
  { name: 'SQL', value: 'sql' },
  { name: 'Swift', value: 'swift' },
  { name: 'TypeScript', value: 'typescript' },
  { name: 'Zig', value: 'zig' },
];

export async function promptProjectConfig(
  detection: DetectionResult,
  overrides?: {
    defaultMode?: 'minimal' | 'full';
  }
): Promise<ProjectConfig> {
  const questions = [];

  let setupMode: 'minimal' | 'full';
  if (overrides?.defaultMode) {
    setupMode = overrides.defaultMode;
  } else {
    const { mode } = await inquirer.prompt<{ mode: 'minimal' | 'full' }>([
      {
        type: 'list',
        name: 'mode',
        message: 'Setup mode:',
        choices: [
          { name: 'Minimal – essentials only (README, LICENSE, tests, basic CI)', value: 'minimal' },
          { name: 'Full – complete setup with all Rulebook features', value: 'full' },
        ],
        default: 'full',
      },
    ]);
    setupMode = mode;
  }

  const isMinimal = setupMode === 'minimal';

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
        choices: LANGUAGE_CHOICES,
        default: detection.languages.map((l) => l.language),
        validate: (answer: string[]) => {
          if (answer.length < 1) {
            return 'You must select at least one language.';
          }
          return true;
        },
      });
    }
  } else {
    questions.push({
      type: 'checkbox',
      name: 'languages',
      message: 'Select the languages used in this project:',
      choices: LANGUAGE_CHOICES,
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

  if (!isMinimal) {
    const detectedModules = detection.modules.filter((m) => m.detected).map((m) => m.module);
    questions.push({
      type: 'checkbox',
      name: 'modules',
      message: 'Select MCP modules to include rules for:',
      choices: [
        {
          name: 'Vectorizer (semantic search)',
          value: 'vectorizer',
          checked: detectedModules.includes('vectorizer'),
        },
        {
          name: 'Synap (key-value store)',
          value: 'synap',
          checked: detectedModules.includes('synap'),
        },
        {
          name: 'OpenSpec (proposal system)',
          value: 'openspec',
          checked: detectedModules.includes('openspec'),
        },
        {
          name: 'Context7 (library docs)',
          value: 'context7',
          checked: detectedModules.includes('context7'),
        },
        {
          name: 'GitHub MCP Server (workflow validation & CI/CD monitoring)',
          value: 'github',
          checked: detectedModules.includes('github'),
        },
        {
          name: 'Playwright (browser automation & testing)',
          value: 'playwright',
          checked: detectedModules.includes('playwright'),
        },
        {
          name: 'Supabase (database, auth, storage)',
          value: 'supabase',
          checked: detectedModules.includes('supabase'),
        },
        {
          name: 'Notion (documentation & task management)',
          value: 'notion',
          checked: detectedModules.includes('notion'),
        },
        {
          name: 'Atlassian (Jira, Confluence, Bitbucket)',
          value: 'atlassian',
          checked: detectedModules.includes('atlassian'),
        },
        {
          name: 'Serena (AI development assistant)',
          value: 'serena',
          checked: detectedModules.includes('serena'),
        },
        {
          name: 'Figma (design system integration)',
          value: 'figma',
          checked: detectedModules.includes('figma'),
        },
        {
          name: 'Grafana (metrics & dashboards)',
          value: 'grafana',
          checked: detectedModules.includes('grafana'),
        },
      ],
    });
  }

  // Framework selection
  const frameworkChoices = detection.frameworks.map((framework) => ({
    name: `${FRAMEWORK_LABELS[framework.framework]} (${framework.languages
      .map((lang) => lang.toUpperCase())
      .join(', ')})${framework.detected ? ' – detected' : ''}`,
    value: framework.framework,
    checked: framework.detected,
  }));

  if (frameworkChoices.length > 0) {
    questions.push({
      type: 'checkbox',
      name: 'frameworks',
      message: 'Select frameworks to include instructions for:',
      choices: frameworkChoices,
      pageSize: Math.min(frameworkChoices.length, 10),
    });
  }

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
      { name: 'Tabnine', value: 'tabnine' },
      { name: 'Replit', value: 'replit' },
      { name: 'JetBrains AI', value: 'jetbrains' },
      { name: 'Zed', value: 'zed' },
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

  // Git workflow
  questions.push({
    type: 'confirm',
    name: 'includeGitWorkflow',
    message: 'Include Git workflow guidelines in AGENTS.md?',
    default: true,
  });

  // Git push mode (only if git workflow included)
  const gitWorkflowAnswer = await inquirer.prompt<{ gitPushMode: 'manual' | 'prompt' | 'auto' }>([
    {
      type: 'list',
      name: 'gitPushMode',
      message: 'Git push behavior for AI assistants:',
      choices: [
        {
          name: 'Manual - Provide push commands for manual execution (recommended for SSH with password)',
          value: 'manual',
        },
        {
          name: 'Prompt - Ask before each push',
          value: 'prompt',
        },
        {
          name: 'Auto - Automatic push (only for passwordless setups)',
          value: 'auto',
        },
      ],
      default: 'manual',
      when: (answers: { includeGitWorkflow?: boolean }) => answers.includeGitWorkflow !== false,
    },
  ]);

  // Git hooks installation prompt (only if hooks don't exist)
  const hasPreCommit = detection.gitHooks?.preCommitExists ?? false;
  const hasPrePush = detection.gitHooks?.prePushExists ?? false;
  const shouldPromptHooks = !hasPreCommit || !hasPrePush;
  
  let installGitHooks = false;
  if (shouldPromptHooks) {
    const hooksAnswer = await inquirer.prompt<{ installHooks: boolean }>([
      {
        type: 'confirm',
        name: 'installHooks',
        message: `Install Git hooks for automated quality checks? ${!hasPreCommit ? '(pre-commit)' : ''} ${!hasPrePush ? '(pre-push)' : ''}`,
        default: true,
      },
    ]);
    installGitHooks = hooksAnswer.installHooks;
  }

  const answers = await inquirer.prompt(questions);

  return {
    languages: answers.languages || detection.languages.map((l) => l.language),
    modules: isMinimal ? [] : answers.modules || [],
    frameworks:
      answers.frameworks ||
      detection.frameworks.filter((f) => f.detected).map((f) => f.framework),
    ides: answers.ides || ['cursor'],
    projectType: answers.projectType,
    coverageThreshold: answers.coverageThreshold,
    strictDocs: answers.strictDocs,
    generateWorkflows: answers.generateWorkflows,
    includeGitWorkflow: answers.includeGitWorkflow,
    gitPushMode: gitWorkflowAnswer.gitPushMode || 'manual',
    installGitHooks,
    minimal: isMinimal,
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
