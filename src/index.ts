#!/usr/bin/env node

import { Command } from 'commander';
import {
  initCommand,
  validateCommand,
  workflowsCommand,
  checkDepsCommand,
  checkCoverageCommand,
  generateDocsCommand,
  versionCommand,
  changelogCommand,
  healthCommand,
  fixCommand,
  watcherCommand,
  agentCommand,
  configCommand,
  tasksCommand,
} from './cli/commands.js';

const program = new Command();

program
  .name('rulebook')
  .description('CLI tool to standardize AI-generated projects with templates and rules')
  .version('0.10.0');

program
  .command('init')
  .description('Initialize rulebook for current project')
  .option('-y, --yes', 'Skip prompts and use detected defaults')
  .action(initCommand);

program
  .command('workflows')
  .description('Generate GitHub Actions workflows for detected languages')
  .action(workflowsCommand);

program
  .command('validate')
  .description('Validate project structure against rulebook standards')
  .action(validateCommand);

program
  .command('check-deps')
  .description('Check for outdated and vulnerable dependencies')
  .action(checkDepsCommand);

program
  .command('check-coverage')
  .description('Check test coverage against threshold')
  .option('-t, --threshold <number>', 'Coverage threshold percentage', '95')
  .action((options) => checkCoverageCommand({ threshold: parseInt(options.threshold) }));

program
  .command('generate-docs')
  .description('Generate documentation structure and standard files')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(generateDocsCommand);

program
  .command('version')
  .description('Bump project version (semantic versioning)')
  .argument('<type>', 'Version bump type: major, minor, or patch')
  .action((type: string) => {
    if (!['major', 'minor', 'patch'].includes(type)) {
      console.error('Error: type must be major, minor, or patch');
      process.exit(1);
    }
    versionCommand({ type: type as 'major' | 'minor' | 'patch' });
  });

program
  .command('changelog')
  .description('Generate changelog from git commits')
  .option('-v, --version <version>', 'Specify version (default: auto-detect)')
  .action(changelogCommand);

program.command('health').description('Check project health score').action(healthCommand);

program.command('fix').description('Auto-fix common project issues').action(fixCommand);

// New advanced commands
program
  .command('watcher')
  .description('Start modern full-screen console watcher for OpenSpec tasks and agent progress')
  .action(watcherCommand);

program
  .command('agent')
  .description('Start autonomous agent for managing AI CLI workflows')
  .option('--dry-run', 'Simulate execution without making changes')
  .option('--tool <name>', 'Specify CLI tool to use (cursor-agent, claude-code, gemini-cli)')
  .option('--iterations <number>', 'Maximum number of iterations', '10')
  .option('--watch', 'Enable watcher mode for real-time monitoring')
  .action((options) =>
    agentCommand({
      dryRun: options.dryRun,
      tool: options.tool,
      iterations: parseInt(options.iterations),
      watch: options.watch,
    })
  );

program
  .command('config')
  .description('Manage rulebook configuration')
  .option('--show', 'Show current configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--feature <name>', 'Feature name for enable/disable')
  .option('--enable', 'Enable feature')
  .option('--disable', 'Disable feature')
  .action((options) =>
    configCommand({
      show: options.show,
      set: options.set,
      feature: options.feature,
      enable: options.enable,
    })
  );

program
  .command('tasks')
  .description('Manage OpenSpec tasks')
  .option('--tree', 'Show task dependency tree')
  .option('--current', 'Show current active task')
  .option('--status <taskId>', 'Update task status')
  .action((options) =>
    tasksCommand({
      tree: options.tree,
      current: options.current,
      status: options.status,
    })
  );

program.parse(process.argv);
