#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { detectProject } from './core/detector.js';
import { promptProjectConfig, promptMergeStrategy } from './cli/prompts.js';
import { generateFullAgents } from './core/generator.js';
import { mergeFullAgents } from './core/merger.js';
import { writeFile, createBackup } from './utils/file-system.js';
import { parseRulesIgnore } from './utils/rulesignore.js';
import path from 'path';

const program = new Command();

program
  .name('rulebook')
  .description('CLI tool to standardize AI-generated projects with templates and rules')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize rulebook for current project')
  .option('-y, --yes', 'Skip prompts and use detected defaults')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      
      console.log(chalk.bold.blue('\n🔍 Rulebook Project Initializer\n'));

      // Detect project
      const spinner = ora('Detecting project structure...').start();
      const detection = await detectProject(cwd);
      spinner.succeed('Project detection complete');

      // Show detection results
      if (detection.languages.length > 0) {
        console.log(chalk.green('\n✓ Detected languages:'));
        for (const lang of detection.languages) {
          console.log(
            `  - ${lang.language} (${(lang.confidence * 100).toFixed(0)}% confidence)`
          );
          console.log(`    Indicators: ${lang.indicators.join(', ')}`);
        }
      }

      if (detection.modules.filter((m) => m.detected).length > 0) {
        console.log(chalk.green('\n✓ Detected modules:'));
        for (const module of detection.modules.filter((m) => m.detected)) {
          console.log(`  - ${module.module} (${module.source})`);
        }
      }

      if (detection.existingAgents) {
        console.log(
          chalk.yellow(
            `\n⚠ Found existing AGENTS.md with ${detection.existingAgents.blocks.length} blocks`
          )
        );
        for (const block of detection.existingAgents.blocks) {
          console.log(`  - ${block.name}`);
        }
      }

      // Get project configuration
      let config;
      if (options.yes) {
        config = {
          languages: detection.languages.map((l) => l.language),
          modules: detection.modules.filter((m) => m.detected).map((m) => m.module),
          ides: ['cursor'],
          projectType: 'application' as const,
          coverageThreshold: 95,
          strictDocs: true,
          generateWorkflows: true,
        };
        console.log(chalk.blue('\nUsing detected defaults...'));
      } else {
        console.log('');
        config = await promptProjectConfig(detection);
      }

      // Check .rulesignore
      const rulesIgnore = await parseRulesIgnore(cwd);
      if (rulesIgnore.patterns.length > 0) {
        console.log(chalk.yellow('\n📋 Found .rulesignore with patterns:'));
        for (const pattern of rulesIgnore.patterns) {
          console.log(`  - ${pattern}`);
        }
      }

      // Generate or merge AGENTS.md
      const agentsPath = path.join(cwd, 'AGENTS.md');
      let finalContent: string;

      if (detection.existingAgents) {
        const strategy = options.yes ? 'merge' : await promptMergeStrategy();

        if (strategy === 'merge') {
          const mergeSpinner = ora('Merging with existing AGENTS.md...').start();
          finalContent = await mergeFullAgents(detection.existingAgents, config);
          
          // Create backup
          const backupPath = await createBackup(agentsPath);
          mergeSpinner.succeed(`Backup created: ${path.basename(backupPath)}`);
        } else {
          const backupSpinner = ora('Creating backup...').start();
          const backupPath = await createBackup(agentsPath);
          backupSpinner.succeed(`Backup created: ${path.basename(backupPath)}`);

          const genSpinner = ora('Generating new AGENTS.md...').start();
          finalContent = await generateFullAgents(config);
          genSpinner.succeed('AGENTS.md generated');
        }
      } else {
        const genSpinner = ora('Generating AGENTS.md...').start();
        finalContent = await generateFullAgents(config);
        genSpinner.succeed('AGENTS.md generated');
      }

      // Write AGENTS.md
      await writeFile(agentsPath, finalContent);
      console.log(chalk.green(`\n✅ AGENTS.md written to ${agentsPath}`));

      // Generate workflows if requested
      if (config.generateWorkflows) {
        console.log(chalk.blue('\n📦 Workflow generation coming in next version...'));
      }

      console.log(chalk.bold.green('\n✨ Rulebook initialization complete!\n'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  1. Review AGENTS.md'));
      console.log(chalk.gray('  2. Create .rulesignore if needed'));
      console.log(chalk.gray('  3. Set up /docs structure'));
      console.log(chalk.gray('  4. Run your AI assistant with the new rules\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate project structure against rulebook standards')
  .action(async () => {
    console.log(chalk.blue('\n🔍 Validation coming in next version...\n'));
  });

program.parse(process.argv);

