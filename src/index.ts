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
} from './cli/commands.js';

const program = new Command();

program
  .name('rulebook')
  .description('CLI tool to standardize AI-generated projects with templates and rules')
  .version('0.9.0');

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

program.parse(process.argv);
