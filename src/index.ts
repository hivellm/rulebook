#!/usr/bin/env node

import { Command } from 'commander';
import {
  initCommand,
  validateCommand,
  workflowsCommand,
  checkDepsCommand,
  checkCoverageCommand,
  generateDocsCommand,
} from './cli/commands.js';

const program = new Command();

program
  .name('rulebook')
  .description('CLI tool to standardize AI-generated projects with templates and rules')
  .version('0.4.0');

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

program.parse(process.argv);
