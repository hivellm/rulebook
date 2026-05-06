import chalk from 'chalk';
import ora from 'ora';
import { detectProject } from '../../core/detect/detector.js';
import { generateWorkflows } from '../../core/generators/workflow-generator.js';
import { existsSync } from 'fs';
import { RulebookConfig } from '../../types.js';
import path from 'path';
import { readFile } from '../../utils/file-system.js';

export async function doctorCommand(): Promise<void> {
  const cwd = process.cwd();
  const spinner = ora('Running rulebook doctor...').start();
  try {
    const { runDoctor } = await import('../../core/quality/doctor.js');
    const report = await runDoctor(cwd);
    spinner.succeed(
      `Doctor: ${report.passCount} pass, ${report.warnCount} warn, ${report.failCount} fail`
    );
    for (const check of report.checks) {
      const icon =
        check.status === 'pass'
          ? chalk.green('✓')
          : check.status === 'warn'
            ? chalk.yellow('⚠')
            : chalk.red('✗');
      console.log(`  ${icon} ${check.name}: ${check.message}`);
    }
  } catch (error) {
    spinner.fail(`Doctor failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function validateCommand(): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n🔍 Rulebook Project Validator\n'));

    const spinner = ora('Validating project structure...').start();

    const { validateProject } = await import('../../core/quality/validator.js');

    const result = await validateProject(cwd);
    spinner.stop();

    if (result.valid) {
      console.log(chalk.green(`\n✅ Validation passed! Score: ${result.score}/100\n`));
    } else {
      console.log(chalk.red(`\n❌ Validation failed. Score: ${result.score}/100\n`));
    }

    if (result.errors.length > 0) {
      console.log(chalk.red.bold('Errors:'));
      for (const error of result.errors) {
        console.log(chalk.red(`  ❌ ${error.category}: ${error.message}`));
        if (error.file) {
          console.log(chalk.gray(`     File: ${error.file}`));
        }
      }
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow.bold('Warnings:'));
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  ⚠️  ${warning.category}: ${warning.message}`));
        if (warning.file) {
          console.log(chalk.gray(`     File: ${warning.file}`));
        }
      }
      console.log('');
    }

    if (result.valid && result.warnings.length === 0) {
      console.log(chalk.green('🎉 Perfect! Your project follows all rulebook standards.\n'));
    } else if (result.valid) {
      console.log(
        chalk.yellow(`✅ Project is valid but has ${result.warnings.length} warnings to address.\n`)
      );
    } else {
      console.log(chalk.red(`❌ Project has ${result.errors.length} errors that must be fixed.\n`));
      console.log(chalk.gray('Run "rulebook init" to set up missing standards.\n'));
    }

    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('\n❌ Validation error:'), error);
    process.exit(1);
  }
}

export async function workflowsCommand(): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n📦 Generating GitHub Actions Workflows\n'));

    const spinner = ora('Detecting project languages...').start();
    const detection = await detectProject(cwd);
    spinner.succeed('Detection complete');

    if (detection.languages.length === 0) {
      console.log(chalk.yellow('\n⚠ No languages detected. Cannot generate workflows.'));
      console.log(chalk.gray('Ensure you have project files (Cargo.toml, package.json, etc.)\n'));
      return;
    }

    const config = {
      languages: detection.languages.map((l) => l.language),
      modules: [],
      ides: [],
      projectType: 'application' as const,
      coverageThreshold: 95,
      strictDocs: true,
      generateWorkflows: true,
    };

    const workflowSpinner = ora('Generating workflows...').start();
    const workflows = await generateWorkflows(config, cwd);
    workflowSpinner.succeed(`Generated ${workflows.length} workflow files`);

    console.log(chalk.green('\n✅ Workflows generated:\n'));
    for (const workflow of workflows) {
      console.log(chalk.gray(`  - ${path.relative(cwd, workflow)}`));
    }

    console.log(chalk.bold.green('\n✨ Done!\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  }
}

export async function checkDepsCommand(): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n🔍 Checking Dependencies\n'));

    const spinner = ora('Analyzing dependencies...').start();

    const { checkDependencies } = await import('../../core/quality/dependency-checker.js');
    const result = await checkDependencies(cwd);

    spinner.succeed('Analysis complete');

    console.log('');
    console.log(chalk.bold('Dependency Summary:'));
    console.log(chalk.gray(`  Total: ${result.total}`));
    console.log(chalk.green(`  Up-to-date: ${result.upToDate}`));

    if (result.outdated.length > 0) {
      console.log(chalk.yellow(`  Outdated: ${result.outdated.length}`));
    }

    if (result.vulnerable.length > 0) {
      console.log(chalk.red(`  Vulnerable: ${result.vulnerable.length}`));
    }

    if (result.outdated.length > 0) {
      console.log('');
      console.log(chalk.yellow.bold('Outdated Dependencies:'));
      for (const dep of result.outdated.slice(0, 10)) {
        console.log(chalk.yellow(`  ↑ ${dep.name}: ${dep.current} → ${dep.latest}`));
      }
      if (result.outdated.length > 10) {
        console.log(chalk.gray(`  ... and ${result.outdated.length - 10} more`));
      }
    }

    if (result.vulnerable.length > 0) {
      console.log('');
      console.log(chalk.red.bold('Vulnerable Dependencies:'));
      for (const vuln of result.vulnerable.slice(0, 5)) {
        console.log(chalk.red(`  ❌ ${vuln.name} (${vuln.severity}): ${vuln.title}`));
      }
      if (result.vulnerable.length > 5) {
        console.log(chalk.gray(`  ... and ${result.vulnerable.length - 5} more`));
      }
      console.log('');
      console.log(chalk.red.bold('⚠️  SECURITY: Update vulnerable dependencies immediately!'));
    }

    console.log('');

    if (result.outdated.length === 0 && result.vulnerable.length === 0) {
      console.log(chalk.green('✅ All dependencies are up-to-date and secure!\n'));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error checking dependencies:'), error);
    process.exit(1);
  }
}

export async function checkCoverageCommand(options: { threshold?: number }): Promise<void> {
  try {
    const cwd = process.cwd();
    const threshold = options.threshold || 95;

    console.log(chalk.bold.blue('\n📊 Checking Test Coverage\n'));

    const spinner = ora('Running coverage analysis...').start();

    const { checkCoverage } = await import('../../core/quality/coverage-checker.js');
    const result = await checkCoverage(cwd, threshold);

    spinner.succeed('Coverage analysis complete');

    console.log('');
    console.log(chalk.bold('Coverage Summary:'));
    console.log(chalk.gray(`  Threshold: ${threshold}%`));
    console.log(
      result.meetsThreshold
        ? chalk.green(`  Actual: ${result.percentage.toFixed(2)}% ✅`)
        : chalk.red(`  Actual: ${result.percentage.toFixed(2)}% ❌`)
    );

    if (result.details) {
      console.log('');
      console.log(chalk.bold('Details:'));
      if (result.details.lines) {
        console.log(chalk.gray(`  Lines: ${result.details.lines.toFixed(2)}%`));
      }
      if (result.details.statements) {
        console.log(chalk.gray(`  Statements: ${result.details.statements.toFixed(2)}%`));
      }
      if (result.details.functions) {
        console.log(chalk.gray(`  Functions: ${result.details.functions.toFixed(2)}%`));
      }
      if (result.details.branches) {
        console.log(chalk.gray(`  Branches: ${result.details.branches.toFixed(2)}%`));
      }
    }

    console.log('');

    if (result.meetsThreshold) {
      console.log(chalk.green(`✅ Coverage meets threshold of ${threshold}%!\n`));
    } else {
      console.log(
        chalk.red(`❌ Coverage ${result.percentage.toFixed(2)}% is below threshold ${threshold}%\n`)
      );
      console.log(chalk.gray('Add more tests to increase coverage.\n'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error checking coverage:'), error);
    process.exit(1);
  }
}

export async function versionCommand(options: {
  type: 'major' | 'minor' | 'patch';
}): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n📦 Version Bump\n'));

    const { bumpProjectVersion } = await import('../../core/state/version-bumper.js');

    const spinner = ora('Bumping version...').start();

    const result = await bumpProjectVersion(cwd, options.type);

    spinner.succeed(`Version bumped: ${result.oldVersion} → ${result.newVersion}`);

    console.log('');
    console.log(chalk.green('✅ Files updated:\n'));
    result.filesUpdated.forEach((file) => {
      console.log(chalk.gray(`  - ${file}`));
    });

    console.log('');
    console.log(chalk.yellow('Next steps:'));
    console.log(chalk.gray('  1. Review changes'));
    console.log(chalk.gray('  2. Update CHANGELOG.md (or run: rulebook changelog)'));
    console.log(
      chalk.gray(
        `  3. Commit: git add . && git commit -m "chore: Release version ${result.newVersion}"`
      )
    );
    console.log(
      chalk.gray(`  4. Tag: git tag -a v${result.newVersion} -m "Release v${result.newVersion}"`)
    );
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function configCommand(options: {
  show?: boolean;
  set?: string;
  feature?: string;
  enable?: boolean;
}): Promise<void> {
  try {
    const cwd = process.cwd();
    const { createConfigManager } = await import('../../core/state/config-manager.js');

    const configManager = createConfigManager(cwd);

    if (options.show) {
      const summary = await configManager.getConfigSummary();

      console.log(chalk.bold.blue('\n⚙️  Rulebook Configuration\n'));
      console.log(chalk.white(`Version: ${summary.version}`));
      console.log(chalk.white(`Project ID: ${summary.projectId}`));
      console.log(chalk.white(`Coverage Threshold: ${summary.coverageThreshold}%`));
      console.log(chalk.white(`CLI Tools: ${summary.cliTools.join(', ') || 'None detected'}`));
      console.log(chalk.white(`Enabled Features: ${summary.enabledFeatures.join(', ')}`));
    } else if (options.feature && typeof options.enable === 'boolean') {
      // Special-case the `memory` toggle: subsystems read `memory.enabled`
      // (config root), not `features.memory`. Set both for consistency.
      if (options.feature === 'memory') {
        const cfg = await configManager.loadConfig();
        await configManager.updateConfig({
          memory: { ...(cfg.memory ?? {}), enabled: options.enable },
        });
      }
      await configManager.toggleFeature(
        options.feature as keyof RulebookConfig['features'],
        options.enable
      );
      console.log(
        chalk.green(`✅ Feature '${options.feature}' ${options.enable ? 'enabled' : 'disabled'}`)
      );
    } else if (options.set) {
      const [key, value] = options.set.split('=');
      if (!key || !value) {
        console.error(chalk.red('Invalid set format. Use: --set key=value'));
        process.exit(1);
      }

      let parsedValue: string | number | boolean = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);

      await configManager.updateConfig({ [key]: parsedValue });
      console.log(chalk.green(`✅ Configuration updated: ${key} = ${value}`));
    } else {
      console.log(chalk.bold.blue('\n⚙️  Rulebook Configuration\n'));
      console.log(chalk.gray('Available commands:'));
      console.log(chalk.gray('  --show                    Show current configuration'));
      console.log(chalk.gray('  --set key=value          Set configuration value'));
      console.log(chalk.gray('  --feature name --enable  Enable a feature'));
      console.log(chalk.gray('  --feature name --disable Disable a feature'));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Config error:'), error);
    process.exit(1);
  }
}

export async function setupClaudeCodePlugin(): Promise<void> {
  const oraModule = await import('ora');
  const oraFn = oraModule.default;
  const spinner = oraFn('Setting up Claude Code plugin...').start();

  try {
    const fs = await import('fs/promises');
    const url = await import('url');
    const os = await import('os');

    const packageDir = path.dirname(url.fileURLToPath(import.meta.url));
    const pluginJsonPath = path.join(packageDir, '..', '..', '..', '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(await readFile(pluginJsonPath));

    const homeDir = os.homedir();
    const pluginsDir = path.join(homeDir, '.claude', 'plugins');
    const installedPluginsPath = path.join(pluginsDir, 'installed_plugins.json');

    await fs.mkdir(pluginsDir, { recursive: true });

    let installedPlugins: { version: number; plugins: Record<string, unknown[]> } = {
      version: 2,
      plugins: {},
    };

    if (existsSync(installedPluginsPath)) {
      const content = await readFile(installedPluginsPath);
      installedPlugins = JSON.parse(content);
    }

    const pluginKey = `rulebook@hivehub`;
    const version = pluginJson.version || '3.2.1';
    const installPath = path.join(pluginsDir, 'cache', 'hivehub', 'rulebook', version);

    if (!installedPlugins.plugins[pluginKey]) {
      installedPlugins.plugins[pluginKey] = [];
    }

    const entries = installedPlugins.plugins[pluginKey] as Record<string, unknown>[];

    if (entries.length > 0) {
      const originalInstalledAt = (entries[0] as { installedAt?: string }).installedAt;
      installedPlugins.plugins[pluginKey] = [
        {
          scope: 'user',
          installPath: installPath,
          version: version,
          installedAt: originalInstalledAt || new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
      ];
    } else {
      entries.push({
        scope: 'user',
        installPath: installPath,
        version: version,
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
    }

    await fs.writeFile(installedPluginsPath, JSON.stringify(installedPlugins, null, 2));

    spinner.succeed('Claude Code plugin installed');
    console.log(`\n  ${chalk.green('✓')} Plugin: ${pluginKey} v${version}`);
    console.log(`  ${chalk.gray('Installed to:')} ${installPath}`);
    console.log(`\n  ${chalk.blue('Note:')} Restart Claude Code to load the plugin.\n`);
  } catch (error) {
    spinner.fail('Failed to install plugin');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function migrateMemoryDirectory(): Promise<void> {
  const oraModule = await import('ora');
  const oraFn = oraModule.default;
  const spinner = oraFn('Migrating memory directory structure...').start();

  try {
    const { createConfigManager } = await import('../../core/state/config-manager.js');
    const fs = await import('fs');
    const fsPromises = fs.promises;
    const cwd = process.cwd();

    const oldDir = path.join(cwd, '.rulebook-memory');
    const rulebookDir = path.join(cwd, '.rulebook');
    const newDir = path.join(rulebookDir, 'memory');

    if (!existsSync(oldDir)) {
      spinner.info('No old memory directory found (.rulebook-memory)');
      return;
    }

    if (!existsSync(rulebookDir)) {
      await fsPromises.mkdir(rulebookDir, { recursive: true });
    }

    await fsPromises.mkdir(newDir, { recursive: true });

    const files = await fsPromises.readdir(oldDir);
    for (const file of files) {
      const oldPath = path.join(oldDir, file);
      const newPath = path.join(newDir, file);
      await fsPromises.copyFile(oldPath, newPath);
    }

    await fsPromises.rm(oldDir, { recursive: true, force: true });

    const configManager = createConfigManager(cwd);
    const existingConfig = await configManager.loadConfig();
    if (existingConfig.memory) {
      existingConfig.memory.dbPath = '.rulebook/memory/memory.db';
    }
    await configManager.updateConfig(existingConfig);

    spinner.succeed('Memory directory migrated');
    console.log(`\n  ${chalk.green('✓')} Migrated to: ${newDir}`);
    console.log(`  ${chalk.gray('Old directory removed: .rulebook-memory')}\n`);
  } catch (error) {
    spinner.fail('Failed to migrate memory directory');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}
