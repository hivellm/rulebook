import chalk from 'chalk';
import ora from 'ora';
import { detectProject } from '../core/detector.js';
import { promptProjectConfig, promptSimplifiedConfig, promptMergeStrategy } from './prompts.js';
import { generateFullAgents } from '../core/generator.js';
import { mergeFullAgents } from '../core/merger.js';
import {
  generateWorkflows,
  generateIDEFiles,
  generateAICLIFiles,
} from '../core/workflow-generator.js';
import { writeFile, createBackup, ensureDir } from '../utils/file-system.js';
import { existsSync } from 'fs';
import { parseRulesIgnore } from '../utils/rulesignore.js';
import { RulebookConfig } from '../types.js';
import { installGitHooks } from '../utils/git-hooks.js';
import type {
  LanguageDetection,
  ProjectConfig,
  FrameworkId,
  ModuleDetection,
  ServiceId,
  SkillCategory,
} from '../types.js';
import { scaffoldMinimalProject } from '../core/minimal-scaffolder.js';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { SkillsManager, getDefaultTemplatesPath } from '../core/skills-manager.js';

const FRAMEWORK_LABELS: Record<FrameworkId, string> = {
  nestjs: 'NestJS',
  spring: 'Spring Boot',
  laravel: 'Laravel',
  angular: 'Angular',
  react: 'React',
  vue: 'Vue.js',
  nuxt: 'Nuxt',
  nextjs: 'Next.js',
  django: 'Django',
  rails: 'Ruby on Rails',
  flask: 'Flask',
  symfony: 'Symfony',
  zend: 'Zend Framework',
  jquery: 'jQuery',
  reactnative: 'React Native',
  flutter: 'Flutter',
  electron: 'Electron',
};

// Get version from package.json
function getRulebookVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packagePath = path.join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '0.12.1'; // Fallback version
  }
}

export async function initCommand(options: {
  yes?: boolean;
  quick?: boolean;
  minimal?: boolean;
  light?: boolean;
  lean?: boolean;
  package?: string;
  addSequentialThinking?: boolean;
}): Promise<void> {
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
        console.log(`  - ${lang.language} (${(lang.confidence * 100).toFixed(0)}% confidence)`);
        console.log(`    Indicators: ${lang.indicators.join(', ')}`);
      }
    }

    if (detection.modules.filter((m) => m.detected).length > 0) {
      console.log(chalk.green('\n✓ Detected modules:'));
      for (const module of detection.modules.filter((m) => m.detected)) {
        console.log(`  - ${module.module} (${module.source})`);
      }
    }

    // Show monorepo detection
    if (detection.monorepo?.detected) {
      const mono = detection.monorepo;
      console.log(chalk.green(`\n✓ Monorepo detected: ${chalk.bold(mono.tool ?? 'manual')}`));
      if (mono.packages.length > 0) {
        console.log(`  Packages (${mono.packages.length}): ${mono.packages.slice(0, 5).join(', ')}${mono.packages.length > 5 ? ` +${mono.packages.length - 5} more` : ''}`);
      }
      if (options.package) {
        console.log(chalk.cyan(`  → Initializing package: ${options.package}`));
      }
    }

    // Recommend sequential-thinking MCP if not detected
    const seqThinking = detection.modules.find((m) => m.module === 'sequential_thinking');
    if (seqThinking && !seqThinking.detected) {
      console.log(
        chalk.yellow(
          '\n💡 Tip: Install sequential-thinking MCP for structured problem solving:\n' +
            '   npx @modelcontextprotocol/create-server sequential-thinking\n' +
            '   or add to .mcp.json: { "mcpServers": { "sequential-thinking": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"] } } }'
        )
      );
    }

    const detectedFrameworks = detection.frameworks.filter((f) => f.detected);
    if (detectedFrameworks.length > 0) {
      console.log(chalk.green('\n✓ Detected frameworks:'));
      for (const framework of detectedFrameworks) {
        const languagesLabel = framework.languages.map((lang) => lang.toUpperCase()).join(', ');
        const indicators = framework.indicators.join(', ');
        const label = FRAMEWORK_LABELS[framework.framework] || framework.framework;
        console.log(`  - ${label} (${languagesLabel})${indicators ? ` [${indicators}]` : ''}`);
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
    let config: ProjectConfig;
    const cliMinimal = Boolean(options.minimal);
    const cliLight = Boolean(options.light);
    const cliQuick = Boolean(options.quick);
    const cliLean = Boolean(options.lean);

    if (options.yes) {
      // Full auto mode - no prompts at all
      config = {
        languages: detection.languages.map((l) => l.language),
        modules: cliMinimal ? [] : detection.modules.filter((m) => m.detected).map((m) => m.module),
        frameworks: detection.frameworks.filter((f) => f.detected).map((f) => f.framework),
        ides: cliMinimal ? [] : ['cursor'],
        projectType: 'application' as const,
        coverageThreshold: 95,
        strictDocs: true,
        generateWorkflows: true,
        includeGitWorkflow: true,
        gitPushMode: 'manual',
        installGitHooks: false,
        minimal: cliMinimal,
        lightMode: cliLight,
        modular: true, // Enable modular /rulebook directory by default
      };
      console.log(chalk.blue('\nUsing detected defaults...'));
    } else if (cliQuick) {
      // Quick mode - minimal prompts (language, MCP, hooks only)
      config = await promptSimplifiedConfig(detection);
      config.lightMode = cliLight;
      config.minimal = cliMinimal;
    } else {
      // Full interactive mode
      console.log('');
      config = await promptProjectConfig(detection, {
        defaultMode: cliMinimal ? 'minimal' : 'full',
      });
      config.lightMode = cliLight;
    }

    const minimalMode = config.minimal ?? cliMinimal;
    config.minimal = minimalMode;
    config.modules = minimalMode ? [] : config.modules || [];
    config.frameworks = config.frameworks || [];
    config.ides = minimalMode ? [] : config.ides || ['cursor'];
    config.includeGitWorkflow = config.includeGitWorkflow ?? true;
    config.generateWorkflows = config.generateWorkflows ?? true;
    config.modular = config.modular ?? true; // Enable modular by default
    if (cliLean) {
      config.agentsMode = 'lean';
    }

    let minimalArtifacts: string[] = [];
    if (minimalMode) {
      minimalArtifacts = await scaffoldMinimalProject(cwd, {
        projectName: path.basename(cwd),
        description: 'Essential project scaffolding generated by Rulebook minimal mode.',
        license: 'MIT',
      });
    }

    const detectedHookStatus = {
      preCommit: detection.gitHooks?.preCommitExists ?? false,
      prePush: detection.gitHooks?.prePushExists ?? false,
    };

    const hookLanguages: LanguageDetection[] =
      detection.languages.length > 0
        ? detection.languages
        : config.languages.map((language) => ({
            language: language as LanguageDetection['language'],
            confidence: 1,
            indicators: [],
          }));

    let hooksInstalled = false;
    if (config.installGitHooks) {
      const hookSpinner = ora('Installing Git hooks (pre-commit & pre-push)...').start();
      try {
        await installGitHooks({ languages: hookLanguages, cwd });
        hookSpinner.succeed('Git hooks installed successfully');
        hooksInstalled = true;
      } catch (error) {
        hookSpinner.fail('Failed to install Git hooks');
        console.error(chalk.red('  ➤'), error instanceof Error ? error.message : error);
        console.log(
          chalk.yellow(
            '  ⚠ Skipping automatic hook installation. You can rerun "rulebook init" later to retry or install manually.'
          )
        );
      }
    } else if (!detectedHookStatus.preCommit || !detectedHookStatus.prePush) {
      console.log(
        chalk.gray(
          '\nℹ Git hooks were not installed automatically. Run "rulebook init" again if you want to add them later.'
        )
      );
    }

    const gitHooksActive =
      hooksInstalled || (detectedHookStatus.preCommit && detectedHookStatus.prePush);
    config.installGitHooks = gitHooksActive;

    // Check .rulesignore
    const rulesIgnore = await parseRulesIgnore(cwd);
    if (rulesIgnore.patterns.length > 0) {
      console.log(chalk.yellow('\n📋 Found .rulesignore with patterns:'));
      for (const pattern of rulesIgnore.patterns) {
        console.log(`  - ${pattern}`);
      }
    }

    // Save project configuration to .rulebook
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    // Migrate old directory structure to new consolidated structure
    const dirMigrationSpinner = ora('Migrating directory structure...').start();
    await configManager.migrateDirectoryStructure(cwd);
    dirMigrationSpinner.succeed('Directory structure migrated');

    // Ensure .rulebook/memory/ directory exists for per-project memory persistence
    await ensureDir(path.join(cwd, '.rulebook', 'memory'));

    // Ensure .gitignore has .rulebook entries (keep specs/ and tasks/ tracked)
    await configManager.ensureGitignore();

    // Auto-detect and enable skills based on project detection (v2.0)
    let enabledSkills: string[] = [];
    try {
      const { SkillsManager, getDefaultTemplatesPath } = await import('../core/skills-manager.js');
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);

      // Build a RulebookConfig-like object for skill detection
      const rulebookConfigForSkills = {
        languages: config.languages as LanguageDetection['language'][],
        frameworks: config.frameworks as FrameworkId[],
        modules: config.modules as ModuleDetection['module'][],
        services: config.services as ServiceId[],
      };

      enabledSkills = await skillsManager.autoDetectSkills(rulebookConfigForSkills);

      if (enabledSkills.length > 0) {
        console.log(chalk.green('\n✓ Auto-detected skills:'));
        for (const skillId of enabledSkills) {
          console.log(chalk.gray(`  - ${skillId}`));
        }
      }
    } catch {
      // Skills system not available or error - continue without skills
    }

    // Load existing config to preserve ralph and memory settings
    const existingConfig = await configManager.loadConfig();

    await configManager.updateConfig({
      languages: config.languages as LanguageDetection['language'][],
      frameworks: config.frameworks as FrameworkId[],
      modules: config.modules as ModuleDetection['module'][],
      services: config.services as ServiceId[],
      modular: config.modular ?? true,
      rulebookDir: config.rulebookDir || '.rulebook',
      ...(config.agentsMode ? { agentsMode: config.agentsMode } : {}),
      skills: enabledSkills.length > 0 ? { enabled: enabledSkills } : undefined,
      ralph: existingConfig.ralph,
      memory: existingConfig.memory,
    });

    // --package: generate only the specified package's AGENTS.md and exit
    if (options.package) {
      const packageRoot = path.join(cwd, options.package);
      const { generatePackageAgentsMd } = await import('../core/generator.js');
      await generatePackageAgentsMd(packageRoot, config, cwd);
      console.log(chalk.green(`\n✅ AGENTS.md generated for package: ${options.package}`));
      return;
    }

    // Generate or merge AGENTS.md
    const agentsPath = path.join(cwd, 'AGENTS.md');
    let finalContent: string;

    if (detection.existingAgents) {
      // Migrate flat layout to specs/ subdirectory if needed
      {
        const { hasFlatLayout, migrateFlatToSpecs } = await import('../core/migrator.js');
        const rulebookDirForMigration = config.rulebookDir || '.rulebook';
        if (await hasFlatLayout(cwd, rulebookDirForMigration)) {
          const { migratedFiles } = await migrateFlatToSpecs(cwd, rulebookDirForMigration);
          if (migratedFiles.length > 0) {
            console.log(
              chalk.gray(
                `  Migrated ${migratedFiles.length} file(s) to /${rulebookDirForMigration}/specs/`
              )
            );
          }
        }
      }

      const strategy = options.yes ? 'merge' : await promptMergeStrategy();

      if (strategy === 'merge') {
        const mergeSpinner = ora('Merging with existing AGENTS.md...').start();
        finalContent = await mergeFullAgents(detection.existingAgents, config, cwd);

        // Create backup
        const backupPath = await createBackup(agentsPath);
        mergeSpinner.succeed(`Backup created: ${path.basename(backupPath)}`);
      } else {
        const backupSpinner = ora('Creating backup...').start();
        const backupPath = await createBackup(agentsPath);
        backupSpinner.succeed(`Backup created: ${path.basename(backupPath)}`);

        const genSpinner = ora('Generating new AGENTS.md...').start();
        finalContent = await generateFullAgents(config, cwd);
        genSpinner.succeed('AGENTS.md generated');
      }
    } else {
      const genSpinner = ora('Generating AGENTS.md...').start();
      finalContent = await generateFullAgents(config, cwd);
      genSpinner.succeed('AGENTS.md generated');
    }

    // Write AGENTS.md
    await writeFile(agentsPath, finalContent);
    console.log(chalk.green(`\n✅ AGENTS.md written to ${agentsPath}`));

    // Show Cursor MDC feedback
    if (detection.cursor?.detected) {
      if (detection.cursor.hasMdcRules) {
        console.log(chalk.gray('  • Cursor .mdc rules updated in .cursor/rules/'));
      } else {
        console.log(chalk.gray('  • Cursor .mdc rules generated in .cursor/rules/'));
      }
    }

    // Generate workflows if requested
    if (config.generateWorkflows) {
      const workflowSpinner = ora('Generating GitHub Actions workflows...').start();
      const workflows = await generateWorkflows(config, cwd, {
        mode: minimalMode ? 'minimal' : 'full',
      });
      workflowSpinner.succeed(`Generated ${workflows.length} workflow files`);

      for (const workflow of workflows) {
        console.log(chalk.gray(`  - ${path.relative(cwd, workflow)}`));
      }
    }

    // Generate or update .gitignore
    const gitignoreSpinner = ora('Generating/updating .gitignore...').start();
    const { generateGitignore } = await import('../core/gitignore-generator.js');
    const gitignoreResult = await generateGitignore(cwd, detection.languages);

    if (gitignoreResult.created) {
      gitignoreSpinner.succeed('.gitignore created');
    } else if (gitignoreResult.updated) {
      gitignoreSpinner.succeed('.gitignore updated with missing patterns');
    } else {
      gitignoreSpinner.info('.gitignore already contains all necessary patterns');
    }

    // Generate IDE-specific files
    if (!minimalMode && config.ides.length > 0) {
      const ideSpinner = ora('Generating IDE-specific files...').start();
      const ideFiles = await generateIDEFiles(config, cwd);

      if (ideFiles.length > 0) {
        ideSpinner.succeed(`Generated ${ideFiles.length} IDE configuration files`);
        for (const file of ideFiles) {
          console.log(chalk.gray(`  - ${path.relative(cwd, file)}`));
        }
      } else {
        ideSpinner.info('IDE files already exist (skipped)');
      }
    }

    // Generate AI CLI configuration files (CLAUDE.md, CODEX.md, GEMINI.md)
    if (!minimalMode) {
      const cliSpinner = ora('Generating AI CLI configuration files...').start();
      const cliFiles = await generateAICLIFiles(config, cwd);

      if (cliFiles.length > 0) {
        cliSpinner.succeed(`Generated ${cliFiles.length} AI CLI configuration files`);
        for (const file of cliFiles) {
          console.log(chalk.gray(`  - ${path.relative(cwd, file)}`));
        }
      } else {
        cliSpinner.info('AI CLI files already exist (skipped)');
      }
    }

    // Auto-setup Claude Code integration (MCP + skills)
    if (!minimalMode) {
      const claudeSpinner = ora('Checking Claude Code integration...').start();
      try {
        const { setupClaudeCodeIntegration } = await import('../core/claude-mcp.js');
        const result = await setupClaudeCodeIntegration(cwd);
        if (result.detected) {
          claudeSpinner.succeed('Claude Code integration configured');
          if (result.mcpConfigured) {
            console.log(chalk.gray('  • MCP server added to .mcp.json'));
          }
          if (result.skillsInstalled.length > 0) {
            console.log(
              chalk.gray(
                `  • ${result.skillsInstalled.length} skills installed to .claude/commands/`
              )
            );
          }
          if (result.agentTeamsEnabled) {
            console.log(chalk.gray('  • Multi-agent teams enabled in .claude/settings.json'));
          }
          if (result.agentDefinitionsInstalled.length > 0) {
            console.log(
              chalk.gray(
                `  • ${result.agentDefinitionsInstalled.length} agent definitions installed to .claude/agents/`
              )
            );
          }
        } else {
          claudeSpinner.info('Claude Code not detected (skipped)');
        }
      } catch {
        claudeSpinner.info('Claude Code integration skipped');
      }
    }

    // Install Ralph shell scripts
    try {
      const { installRalphScripts } = await import('../core/ralph-scripts.js');
      const scripts = await installRalphScripts(cwd);
      if (scripts.length > 0) {
        console.log(chalk.gray(`  • ${scripts.length} Ralph scripts installed to .rulebook/scripts/`));
      }
    } catch {
      // Skip if Ralph scripts installation fails
    }

    // Create PLANS.md for session continuity
    try {
      const { initPlans } = await import('../core/plans-manager.js');
      const created = await initPlans(cwd);
      if (created) {
        console.log(chalk.gray('  • PLANS.md created for session continuity'));
      }
    } catch {
      // Non-blocking
    }

    // Create AGENTS.override.md (never overwrites existing)
    try {
      const { initOverride } = await import('../core/override-manager.js');
      const created = await initOverride(cwd);
      if (created) {
        console.log(chalk.gray('  • AGENTS.override.md created (add project-specific rules here)'));
      }
    } catch {
      // Non-blocking
    }

    // --add-sequential-thinking: inject into mcp.json if not already present
    if (options.addSequentialThinking) {
      try {
        await addSequentialThinkingMcp(cwd);
        console.log(chalk.gray('  • sequential-thinking MCP added to mcp.json'));
      } catch {
        console.log(chalk.yellow('  ⚠ Could not add sequential-thinking MCP'));
      }
    }

    if (minimalMode && minimalArtifacts.length > 0) {
      console.log(chalk.green('\n✅ Essentials created:'));
      for (const artifact of minimalArtifacts) {
        console.log(chalk.gray(`  - ${path.relative(cwd, artifact)}`));
      }
    }

    console.log(chalk.bold.green('\n✨ Rulebook initialization complete!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Review AGENTS.md'));
    console.log(chalk.gray('  2. Review generated workflows in .github/workflows/'));
    console.log(chalk.gray('  3. Create .rulesignore if needed'));
    console.log(chalk.gray('  4. Set up /docs structure'));
    console.log(chalk.gray('  5. Run your AI assistant with the new rules\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  }
}

export async function validateCommand(): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n🔍 Rulebook Project Validator\n'));

    const spinner = ora('Validating project structure...').start();

    // Import validator
    const { validateProject } = await import('../core/validator.js');

    const result = await validateProject(cwd);
    spinner.stop();

    // Display results
    if (result.valid) {
      console.log(chalk.green(`\n✅ Validation passed! Score: ${result.score}/100\n`));
    } else {
      console.log(chalk.red(`\n❌ Validation failed. Score: ${result.score}/100\n`));
    }

    // Show errors
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

    // Show warnings
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

    // Summary
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

    // Detect project
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

    const { checkDependencies } = await import('../core/dependency-checker.js');
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

    // Show outdated
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

    // Show vulnerable
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

    const { checkCoverage } = await import('../core/coverage-checker.js');
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

export async function generateDocsCommand(options: { yes?: boolean }): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n📚 Generate Documentation Structure\n'));

    let config;

    if (options.yes) {
      config = {
        projectName: path.basename(cwd),
        description: 'A modern software project',
        author: 'Your Name',
        email: '',
        license: 'MIT',
      };
      console.log(chalk.blue('Using defaults...\n'));
    } else {
      const { promptDocsConfig } = await import('./docs-prompts.js');
      config = await promptDocsConfig();
    }

    const spinner = ora('Generating documentation structure...').start();

    const { generateDocsStructure } = await import('../core/docs-generator.js');
    const generatedFiles = await generateDocsStructure(config, cwd);

    spinner.succeed(`Generated ${generatedFiles.length} files`);

    console.log('');
    console.log(chalk.green('✅ Files created:\n'));
    for (const file of generatedFiles) {
      console.log(chalk.gray(`  - ${path.relative(cwd, file)}`));
    }

    console.log('');
    console.log(chalk.bold.green('✨ Documentation structure ready!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Review and customize generated files'));
    console.log(chalk.gray('  2. Add your project-specific content'));
    console.log(chalk.gray('  3. Update ROADMAP.md with your milestones'));
    console.log(chalk.gray('  4. Document architecture in ARCHITECTURE.md\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error generating docs:'), error);
    process.exit(1);
  }
}

export async function versionCommand(options: {
  type: 'major' | 'minor' | 'patch';
}): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n📦 Version Bump\n'));

    const { bumpProjectVersion } = await import('../core/version-bumper.js');

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

export async function changelogCommand(options: { version?: string }): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n📝 Changelog Generation\n'));

    const { generateChangelog, getCurrentVersion } = await import('../core/changelog-generator.js');

    const version = options.version || (await getCurrentVersion(cwd));

    if (!version) {
      console.error(chalk.red('❌ Could not determine version'));
      console.log(chalk.gray('  Specify version with --version flag'));
      process.exit(1);
    }

    const spinner = ora('Generating changelog from commits...').start();

    const section = await generateChangelog(cwd, version);

    spinner.succeed(`Changelog generated for version ${version}`);

    console.log('');
    console.log(chalk.green('✅ Changelog sections:\n'));

    if (section.breaking.length > 0) {
      console.log(chalk.red('  Breaking Changes: ') + section.breaking.length);
    }
    if (section.added.length > 0) {
      console.log(chalk.green('  Added: ') + section.added.length);
    }
    if (section.changed.length > 0) {
      console.log(chalk.blue('  Changed: ') + section.changed.length);
    }
    if (section.fixed.length > 0) {
      console.log(chalk.yellow('  Fixed: ') + section.fixed.length);
    }

    console.log('');
    console.log(chalk.gray('CHANGELOG.md has been updated'));
    console.log(chalk.gray('Review and edit as needed before committing'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function healthCommand(): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n🏥 Project Health Check\n'));

    const { calculateHealthScore } = await import('../core/health-scorer.js');

    const spinner = ora('Analyzing project health...').start();

    const health = await calculateHealthScore(cwd);

    spinner.succeed('Health analysis complete');

    console.log('');

    console.log(chalk.bold(`Overall Health Score: ${health.overall}/100 (${health.grade})`));
    console.log('');

    console.log(chalk.bold('Category Scores:\n'));
    console.log(`  📝 Documentation: ${health.categories.documentation}/100`);
    console.log(`  🧪 Testing: ${health.categories.testing}/100`);
    console.log(`  🎨 Code Quality: ${health.categories.quality}/100`);
    console.log(`  🔒 Security: ${health.categories.security}/100`);
    console.log(`  🔄 CI/CD: ${health.categories.cicd}/100`);
    console.log(`  📦 Dependencies: ${health.categories.dependencies}/100`);
    console.log(`  🤖 AGENTS.md: ${health.categories.agentsMd}/100`);
    console.log(`  🔁 Ralph: ${health.categories.ralph}/100`);
    console.log(`  🧠 Memory: ${health.categories.memory}/100`);
    console.log('');

    if (health.recommendations.length > 0) {
      console.log(chalk.bold.yellow('Recommendations:\n'));
      health.recommendations.forEach((rec) => {
        console.log(chalk.yellow(`  ${rec}`));
      });
      console.log('');
    }

    if (health.overall >= 90) {
      console.log(chalk.green('🌟 Excellent! Your project is in great shape!'));
    } else if (health.overall >= 70) {
      console.log(chalk.blue('👍 Good project health. A few improvements suggested.'));
    } else {
      console.log(chalk.yellow('⚠️  Project health needs improvement.'));
      console.log(chalk.gray('  Run: rulebook fix'));
      console.log(chalk.gray('  To auto-fix common issues.'));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function fixCommand(): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n🔧 Auto-Fix Common Issues\n'));

    const { autoFixProject, autoFixLint } = await import('../core/auto-fixer.js');

    const spinner = ora('Analyzing and fixing issues...').start();

    const result = await autoFixProject(cwd);

    spinner.succeed('Auto-fix complete');

    console.log('');

    if (result.applied.length > 0) {
      console.log(chalk.green('✅ Fixed:\n'));
      result.applied.forEach((fix) => {
        console.log(chalk.gray(`  - ${fix}`));
      });
      console.log('');
    }

    if (result.skipped.length > 0) {
      console.log(chalk.blue('ℹ️  Skipped:\n'));
      result.skipped.forEach((skip) => {
        console.log(chalk.gray(`  - ${skip}`));
      });
      console.log('');
    }

    if (result.failed.length > 0) {
      console.log(chalk.yellow('⚠️  Failed:\n'));
      result.failed.forEach((fail) => {
        console.log(chalk.gray(`  - ${fail}`));
      });
      console.log('');
    }

    // Try to fix lint errors
    console.log(chalk.blue('🎨 Attempting to fix lint errors...\n'));
    const lintFixed = await autoFixLint(cwd);

    if (lintFixed) {
      console.log(chalk.green('✅ Lint errors fixed'));
    } else {
      console.log(chalk.gray('ℹ️  No lint auto-fix available'));
    }

    console.log('');
    console.log(chalk.bold.green('✨ Auto-fix complete!\n'));
    console.log(chalk.gray('Run: rulebook health'));
    console.log(chalk.gray('To check updated health score.'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), (error as Error).message);
    process.exit(1);
  }
}

export async function watcherCommand(): Promise<void> {
  try {
    const cwd = process.cwd();
    const { startWatcher } = await import('../core/watcher.js');

    console.log(chalk.bold.blue('\n🚀 Starting Modern Console Watcher\n'));
    console.log(chalk.gray('Full-screen interface with system monitoring'));
    console.log(chalk.gray('Press Ctrl+C or F10 to exit\n'));

    await startWatcher(cwd);
  } catch (error) {
    console.error(chalk.red('\n❌ Watcher error:'), error);
    process.exit(1);
  }
}

export async function agentCommand(options: {
  dryRun?: boolean;
  tool?: string;
  iterations?: number;
  watch?: boolean;
}): Promise<void> {
  try {
    const cwd = process.cwd();
    const { startAgent } = await import('../core/agent-manager.js');

    console.log(chalk.bold.blue('\n🤖 Starting Rulebook Agent\n'));

    const agentOptions = {
      dryRun: options.dryRun || false,
      tool: options.tool,
      maxIterations: options.iterations || 10,
      watchMode: options.watch || false,
    };

    if (agentOptions.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No actual changes will be made\n'));
    }

    await startAgent(cwd, agentOptions);
  } catch (error) {
    console.error(chalk.red('\n❌ Agent error:'), error);
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
    const { createConfigManager } = await import('../core/config-manager.js');

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

      // Handle different value types
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

// Task management commands using Rulebook task system
export async function taskCreateCommand(taskId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const { createTaskManager } = await import('../core/task-manager.js');
    const { createConfigManager } = await import('../core/config-manager.js');

    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();
    const rulebookDir = config.rulebookDir || '.rulebook';

    const taskManager = createTaskManager(cwd, rulebookDir);
    await taskManager.createTask(taskId);

    console.log(chalk.green(`✅ Task ${taskId} created successfully`));
    console.log(chalk.gray(`Location: ${rulebookDir}/tasks/${taskId}/`));
    console.log(chalk.yellow('\n⚠️  Remember to:'));
    console.log(chalk.gray('  1. Fill in proposal.md (minimum 20 characters in "Why" section)'));
    console.log(chalk.gray('  3. Add tasks to tasks.md'));
    console.log(chalk.gray('  4. Create spec deltas in specs/*/spec.md'));
    console.log(chalk.gray('  5. Validate with: rulebook task validate ' + taskId));
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to create task: ${error.message}`));
    process.exit(1);
  }
}

export async function taskListCommand(includeArchived: boolean = false): Promise<void> {
  try {
    const cwd = process.cwd();
    const { createTaskManager } = await import('../core/task-manager.js');
    const { createConfigManager } = await import('../core/config-manager.js');

    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();
    const rulebookDir = config.rulebookDir || '.rulebook';

    const taskManager = createTaskManager(cwd, rulebookDir);
    const tasks = await taskManager.listTasks(includeArchived);

    if (tasks.length === 0) {
      console.log(chalk.gray('No tasks found'));
      return;
    }

    console.log(chalk.bold.blue('\n📋 Rulebook Tasks\n'));

    const activeTasks = tasks.filter((t) => !t.archivedAt);
    const archivedTasks = tasks.filter((t) => t.archivedAt);

    if (activeTasks.length > 0) {
      console.log(chalk.bold('Active Tasks:'));
      for (const task of activeTasks) {
        const statusColor =
          task.status === 'completed'
            ? chalk.green
            : task.status === 'in-progress'
              ? chalk.yellow
              : task.status === 'blocked'
                ? chalk.red
                : chalk.gray;
        console.log(
          `  ${statusColor(task.status.padEnd(12))} ${chalk.white(task.id)} - ${chalk.gray(task.title)}`
        );
      }
      console.log('');
    }

    if (includeArchived && archivedTasks.length > 0) {
      console.log(chalk.bold('Archived Tasks:'));
      for (const task of archivedTasks) {
        console.log(
          `  ${chalk.gray('archived'.padEnd(12))} ${chalk.white(task.id)} - ${chalk.gray(task.title)} ${chalk.dim(`(${task.archivedAt})`)}`
        );
      }
      console.log('');
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to list tasks: ${error.message}`));
    process.exit(1);
  }
}

export async function taskShowCommand(taskId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const { createTaskManager } = await import('../core/task-manager.js');
    const { createConfigManager } = await import('../core/config-manager.js');

    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();
    const rulebookDir = config.rulebookDir || '.rulebook';

    const taskManager = createTaskManager(cwd, rulebookDir);
    const task = await taskManager.showTask(taskId);

    if (!task) {
      console.error(chalk.red(`❌ Task ${taskId} not found`));
      process.exit(1);
      return;
    }

    console.log(chalk.bold.blue(`\n📋 Task: ${task.id}\n`));
    console.log(chalk.white(`Title: ${task.title}`));
    console.log(chalk.gray(`Status: ${task.status}`));
    console.log(chalk.gray(`Created: ${task.createdAt}`));
    console.log(chalk.gray(`Updated: ${task.updatedAt}`));
    if (task.archivedAt) {
      console.log(chalk.gray(`Archived: ${task.archivedAt}`));
    }
    console.log('');

    if (task.proposal) {
      console.log(chalk.bold('Proposal:'));
      console.log(
        chalk.gray(task.proposal.substring(0, 500) + (task.proposal.length > 500 ? '...' : ''))
      );
      console.log('');
    }

    if (task.specs && Object.keys(task.specs).length > 0) {
      console.log(chalk.bold('Specs:'));
      for (const [module, spec] of Object.entries(task.specs)) {
        console.log(chalk.gray(`  ${module}/spec.md (${spec.length} chars)`));
      }
      console.log('');
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to show task: ${error.message}`));
    process.exit(1);
  }
}

export async function taskValidateCommand(taskId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const { createTaskManager } = await import('../core/task-manager.js');
    const { createConfigManager } = await import('../core/config-manager.js');

    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();
    const rulebookDir = config.rulebookDir || '.rulebook';

    const taskManager = createTaskManager(cwd, rulebookDir);
    const validation = await taskManager.validateTask(taskId);

    if (validation.valid) {
      console.log(chalk.green(`✅ Task ${taskId} is valid`));
      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`  - ${warning}`));
        }
      }
    } else {
      console.log(chalk.red(`❌ Task ${taskId} validation failed\n`));
      console.log(chalk.red('Errors:'));
      for (const error of validation.errors) {
        console.log(chalk.red(`  - ${error}`));
      }
      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`  - ${warning}`));
        }
      }
      process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to validate task: ${error.message}`));
    process.exit(1);
  }
}

export async function taskArchiveCommand(
  taskId: string,
  skipValidation: boolean = false
): Promise<void> {
  try {
    const cwd = process.cwd();
    const { createTaskManager } = await import('../core/task-manager.js');
    const { createConfigManager } = await import('../core/config-manager.js');

    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();
    const rulebookDir = config.rulebookDir || '.rulebook';

    const taskManager = createTaskManager(cwd, rulebookDir);
    await taskManager.archiveTask(taskId, skipValidation);

    console.log(chalk.green(`✅ Task ${taskId} archived successfully`));
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to archive task: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Initialize MCP configuration in .rulebook file
 * Adds mcp block to .rulebook and creates/updates .cursor/mcp.json
 */
export async function mcpInitCommand(): Promise<void> {
  const { findRulebookConfig } = await import('../mcp/rulebook-server.js');
  const { existsSync, readFileSync, writeFileSync, statSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { createConfigManager } = await import('../core/config-manager.js');

  try {
    // Find or create .rulebook file/directory
    const cwd = process.cwd();
    let rulebookPath = findRulebookConfig(cwd);

    if (!rulebookPath) {
      // Create new .rulebook directory via ConfigManager
      rulebookPath = join(cwd, '.rulebook');
      const configManager = createConfigManager(cwd);
      await configManager.initializeConfig();
    }

    const projectRoot = dirname(rulebookPath);

    // Resolve config file path (handle .rulebook as directory or file)
    let configFilePath = rulebookPath;
    if (existsSync(rulebookPath)) {
      const stats = statSync(rulebookPath);
      if (stats.isDirectory()) {
        configFilePath = join(rulebookPath, 'rulebook.json');
      }
    }

    // Load existing config
    let config: any = {};
    if (existsSync(configFilePath)) {
      const raw = readFileSync(configFilePath, 'utf8');
      config = JSON.parse(raw);
    }

    // Add/update mcp block
    config.mcp = config.mcp ?? {};
    if (config.mcp.enabled === undefined) config.mcp.enabled = true;
    if (!config.mcp.tasksDir) config.mcp.tasksDir = '.rulebook/tasks';
    if (!config.mcp.archiveDir) config.mcp.archiveDir = '.rulebook/archive';

    // Save updated config
    writeFileSync(configFilePath, JSON.stringify(config, null, 2) + '\n');

    // Create/update .cursor/mcp.json if .cursor directory exists
    const cursorDir = join(projectRoot, '.cursor');
    if (existsSync(cursorDir)) {
      const mcpJsonPath = join(cursorDir, 'mcp.json');
      let mcpConfig: any = { mcpServers: {} };

      if (existsSync(mcpJsonPath)) {
        const raw = readFileSync(mcpJsonPath, 'utf8');
        mcpConfig = JSON.parse(raw);
      }

      mcpConfig.mcpServers = mcpConfig.mcpServers ?? {};
      mcpConfig.mcpServers.rulebook = {
        command: 'npx',
        args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
      };

      writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
      console.log(chalk.green('✓ Rulebook MCP initialized'));
      console.log(chalk.gray(`  • Updated .rulebook with MCP configuration`));
      console.log(chalk.gray(`  • Updated .cursor/mcp.json`));
      console.log(chalk.gray(`  • MCP server will find .rulebook automatically`));
    } else {
      console.log(chalk.green('✓ Rulebook MCP initialized'));
      console.log(chalk.gray(`  • Updated .rulebook with MCP configuration`));
      console.log(chalk.gray(`  • To use with Cursor, create .cursor/mcp.json manually`));
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Failed to initialize MCP: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

export async function mcpServerCommand(): Promise<void> {
  try {
    const { startRulebookMcpServer } = await import('../mcp/rulebook-server.js');

    // CRITICAL: In stdio mode, stdout MUST contain ONLY JSON-RPC 2.0 messages
    // stdout must contain ONLY JSON-RPC 2.0 messages for MCP protocol
    // All logs must go to stderr
    // Use environment variable for debug: RULEBOOK_MCP_DEBUG=1
    if (process.env.RULEBOOK_MCP_DEBUG === '1') {
      console.error(chalk.gray('[rulebook-mcp] Starting MCP server with stdio transport'));
      console.error(chalk.gray('[rulebook-mcp] Server will find .rulebook automatically'));
    }

    await startRulebookMcpServer();
  } catch (error: any) {
    // Errors always go to stderr
    console.error(chalk.red(`\n❌ Failed to start MCP server: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

// Legacy tasks command (deprecated - use task commands instead)
export async function tasksCommand(options: {
  tree?: boolean;
  current?: boolean;
  status?: string;
}): Promise<void> {
  console.log(
    chalk.yellow('⚠️  The `tasks` command is deprecated. Use `rulebook task` commands instead.')
  );
  console.log(chalk.gray('  - rulebook task list'));
  console.log(chalk.gray('  - rulebook task show <task-id>'));
  console.log(chalk.gray('  - rulebook task create <task-id>'));
  console.log(chalk.gray('  - rulebook task validate <task-id>'));
  console.log(chalk.gray('  - rulebook task archive <task-id>'));

  if (options.tree || options.current || options.status) {
    console.log(chalk.red('\n❌ Legacy commands are no longer supported.'));
    console.log(chalk.yellow('Please use the Rulebook task system.'));
    process.exit(1);
  }

  // Fallback to list tasks
  await taskListCommand(false);
}

export async function updateCommand(options: {
  yes?: boolean;
  minimal?: boolean;
  light?: boolean;
  lean?: boolean;
}): Promise<void> {
  try {
    const cwd = process.cwd();

    console.log(chalk.bold.blue('\n🔄 Rulebook Update Tool\n'));
    console.log(
      chalk.gray('This will update your AGENTS.md and .rulebook to the latest version\n')
    );

    // Detect project
    const spinner = ora('Detecting project structure...').start();
    const detection = await detectProject(cwd);
    spinner.succeed('Project detection complete');

    // Show detected languages
    if (detection.languages.length > 0) {
      console.log(chalk.green('\n✓ Detected languages:'));
      for (const lang of detection.languages) {
        console.log(`  - ${lang.language} (${(lang.confidence * 100).toFixed(0)}% confidence)`);
      }
    }

    // Check for existing AGENTS.md
    if (!detection.existingAgents) {
      console.log(chalk.yellow('\n⚠ No AGENTS.md found. Use "rulebook init" instead.'));
      process.exit(0);
    }

    console.log(
      chalk.green(
        `\n✓ Found existing AGENTS.md with ${detection.existingAgents.blocks.length} blocks`
      )
    );

    // Get existing blocks to preserve user customizations
    const existingBlocks = detection.existingAgents.blocks.map((b) => b.name);
    console.log(chalk.gray(`  Existing blocks: ${existingBlocks.join(', ')}`));

    let inquirerModule: typeof import('inquirer').default | null = null;
    if (!options.yes) {
      inquirerModule = (await import('inquirer')).default;
      const { confirm } = await inquirerModule.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Update AGENTS.md and .rulebook with latest templates?',
          default: true,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('\nUpdate cancelled'));
        process.exit(0);
      }
    }

    const hasPreCommit = detection.gitHooks?.preCommitExists ?? false;
    const hasPrePush = detection.gitHooks?.prePushExists ?? false;
    const missingHooks = !hasPreCommit || !hasPrePush;
    let installHooksOnUpdate = false;
    let hooksInstalledOnUpdate = false;

    if (missingHooks) {
      if (options.yes) {
        console.log(
          chalk.yellow(
            '\n⚠ Git hooks are missing. Re-run "rulebook update" without --yes to install automated hooks or install them manually.'
          )
        );
      } else {
        if (!inquirerModule) {
          inquirerModule = (await import('inquirer')).default;
        }
        const { installHooks } = await inquirerModule.prompt([
          {
            type: 'confirm',
            name: 'installHooks',
            message: `Install Git hooks for automated quality checks? Missing: ${
              hasPreCommit ? '' : 'pre-commit '
            }${hasPrePush ? '' : 'pre-push'}`.trim(),
            default: true,
          },
        ]);
        installHooksOnUpdate = installHooks;
      }
    }

    if (missingHooks && !installHooksOnUpdate && !options.yes) {
      console.log(
        chalk.gray(
          '\nℹ Git hooks were not installed during update. Re-run "rulebook update" later or install them manually if you change your mind.'
        )
      );
    }

    const agentsPath = path.join(cwd, 'AGENTS.md');

    // Load existing config using ConfigManager
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);
    const existingConfig = await configManager.loadConfig();

    let existingMode: 'minimal' | 'full' | undefined;
    let existingLightMode: boolean | undefined;
    if (existingConfig) {
      if (existingConfig && (existingConfig.mode === 'minimal' || existingConfig.mode === 'full')) {
        existingMode = existingConfig.mode;
      }
      if (existingConfig && (existingConfig as any).lightMode !== undefined) {
        existingLightMode = (existingConfig as any).lightMode;
      }
    }

    const minimalMode = options.minimal ?? existingMode === 'minimal';
    const lightMode = options.light !== undefined ? options.light : (existingLightMode ?? false);
    const leanMode = options.lean ?? (existingConfig?.agentsMode === 'lean');

    // Build config from detected project
    const config: ProjectConfig = {
      languages: detection.languages.map((l) => l.language),
      modules: minimalMode ? [] : detection.modules.filter((m) => m.detected).map((m) => m.module),
      frameworks: detection.frameworks.filter((f) => f.detected).map((f) => f.framework),
      ides: [], // Preserve existing IDE choices
      projectType: 'application' as const,
      coverageThreshold: 95,
      strictDocs: true,
      generateWorkflows: false, // Don't regenerate workflows on update
      includeGitWorkflow: true,
      gitPushMode: 'manual' as const,
      installGitHooks: installHooksOnUpdate,
      minimal: minimalMode,
      lightMode: lightMode,
      ...(leanMode ? { agentsMode: 'lean' as const } : {}),
    };

    if (minimalMode) {
      config.ides = [];
      config.generateWorkflows = true;
    }

    let minimalArtifacts: string[] = [];
    if (minimalMode) {
      minimalArtifacts = await scaffoldMinimalProject(cwd, {
        projectName: path.basename(cwd),
        description: 'Essential project scaffolding refreshed via Rulebook minimal mode.',
        license: 'MIT',
      });
    }

    // Generate Rulebook commands if Cursor is detected
    // This ensures commands are available for all Cursor projects
    const cursorRulesPath = path.join(cwd, '.cursorrules');
    const cursorCommandsDir = path.join(cwd, '.cursor', 'commands');
    const usesCursor = existsSync(cursorRulesPath) || existsSync(cursorCommandsDir);

    // Deprecated notice: .cursorrules is superseded by .cursor/rules/*.mdc in Cursor v0.45+
    if (existsSync(cursorRulesPath)) {
      console.log(
        chalk.yellow(
          '  ⚠ .cursorrules is deprecated as of Cursor v0.45. Use .cursor/rules/*.mdc instead.'
        )
      );
    }

    if (usesCursor) {
      // Check if commands already exist to avoid duplicate generation
      const existingCommandsDir = path.join(cwd, '.cursor', 'commands');
      if (existsSync(existingCommandsDir)) {
        const { readdir } = await import('fs/promises');
        const existingFiles = await readdir(existingCommandsDir);
        const hasRulebookCommands = existingFiles.some((file) => file.startsWith('rulebook-task-'));

        if (!hasRulebookCommands) {
          const { generateCursorCommands } = await import('../core/workflow-generator.js');
          const generatedCommands = await generateCursorCommands(cwd);
          if (generatedCommands.length > 0) {
            console.log(
              chalk.green(
                `  Generated ${generatedCommands.length} Rulebook command(s) in .cursor/commands/`
              )
            );
          }
        }
      } else {
        // Directory doesn't exist, create it and generate commands
        const { generateCursorCommands } = await import('../core/workflow-generator.js');
        const generatedCommands = await generateCursorCommands(cwd);
        if (generatedCommands.length > 0) {
          console.log(
            chalk.green(
              `  Generated ${generatedCommands.length} Rulebook command(s) in .cursor/commands/`
            )
          );
        }
      }
    }

    // Migration already done via configManager.loadConfig() -> migrateConfig() -> migrateDirectoryStructure()
    // No need to call it again here

    // Load existing config to preserve skills and ralph settings (already loaded above)
    const existingSkills = existingConfig.skills?.enabled || [];
    const existingRalph = existingConfig.ralph;

    // Auto-detect skills based on project detection (v2.0)
    let detectedSkills: string[] = [];
    try {
      const { SkillsManager, getDefaultTemplatesPath } = await import('../core/skills-manager.js');
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);

      // Build a RulebookConfig-like object for skill detection
      const rulebookConfigForSkills = {
        languages: config.languages as LanguageDetection['language'][],
        frameworks: config.frameworks as FrameworkId[],
        modules: config.modules as ModuleDetection['module'][],
        services: config.services as ServiceId[],
      };

      detectedSkills = await skillsManager.autoDetectSkills(rulebookConfigForSkills);

      // Merge with existing skills (keep existing, add new detected)
      const mergedSkills = [...new Set([...existingSkills, ...detectedSkills])];

      if (detectedSkills.length > existingSkills.length) {
        const newSkills = detectedSkills.filter((s) => !existingSkills.includes(s));
        if (newSkills.length > 0) {
          console.log(chalk.green('\n✓ New skills detected:'));
          for (const skillId of newSkills) {
            console.log(chalk.gray(`  - ${skillId}`));
          }
        }
      }

      detectedSkills = mergedSkills;
    } catch {
      // Skills system not available or error - preserve existing skills
      detectedSkills = existingSkills;
    }

    await configManager.updateConfig({
      languages: config.languages as LanguageDetection['language'][],
      frameworks: config.frameworks as FrameworkId[],
      modules: config.modules as ModuleDetection['module'][],
      services: config.services as ServiceId[],
      modular: config.modular ?? true,
      rulebookDir: config.rulebookDir || '.rulebook',
      skills: detectedSkills.length > 0 ? { enabled: detectedSkills } : undefined,
      ralph: existingRalph,
      memory: existingConfig.memory,
    });

    // Ensure .rulebook is in .gitignore with exceptions for specs/tasks
    await configManager.ensureGitignore();

    // Migrate flat layout to specs/ subdirectory if needed
    {
      const { hasFlatLayout, migrateFlatToSpecs } = await import('../core/migrator.js');
      const rulebookDirForMigration = config.rulebookDir || '.rulebook';
      if (await hasFlatLayout(cwd, rulebookDirForMigration)) {
        const migrationSpinner = ora('Migrating rulebook files to specs/ subdirectory...').start();
        const { migratedFiles } = await migrateFlatToSpecs(cwd, rulebookDirForMigration);
        if (migratedFiles.length > 0) {
          migrationSpinner.succeed(
            `Migrated ${migratedFiles.length} file(s) to /${rulebookDirForMigration}/specs/`
          );
        } else {
          migrationSpinner.info('No files to migrate');
        }
      }
    }

    // Merge with existing AGENTS.md (with migration support)
    const mergeSpinner = ora('Updating AGENTS.md with latest templates...').start();
    config.modular = config.modular ?? true; // Enable modular by default
    const mergedContent = await mergeFullAgents(detection.existingAgents, config, cwd);
    await writeFile(agentsPath, mergedContent);
    mergeSpinner.succeed('AGENTS.md updated');

    if (installHooksOnUpdate) {
      const hookLanguages: LanguageDetection[] =
        detection.languages.length > 0
          ? detection.languages
          : config.languages.map((language) => ({
              language: language as LanguageDetection['language'],
              confidence: 1,
              indicators: [],
            }));
      const hookSpinner = ora('Installing Git hooks (pre-commit & pre-push)...').start();
      try {
        await installGitHooks({ languages: hookLanguages, cwd });
        hookSpinner.succeed('Git hooks installed successfully');
        hooksInstalledOnUpdate = true;
      } catch (error) {
        hookSpinner.fail('Failed to install Git hooks');
        console.error(chalk.red('  ➤'), error instanceof Error ? error.message : error);
        console.log(
          chalk.yellow(
            '  ⚠ Skipping automatic hook installation. You can rerun "rulebook update" later to retry or install manually.'
          )
        );
      }
    }

    const gitHooksActiveAfterUpdate = hooksInstalledOnUpdate || (hasPreCommit && hasPrePush);
    config.installGitHooks = gitHooksActiveAfterUpdate;

    // Update .rulebook config
    const configSpinner = ora('Updating .rulebook configuration...').start();
    const rulebookFeatures: RulebookConfig['features'] = {
      watcher: false,
      agent: false,
      logging: true,
      telemetry: false,
      notifications: false,
      dryRun: false,
      gitHooks: gitHooksActiveAfterUpdate,
      repl: false,
      templates: true,
      context: minimalMode ? false : true,
      health: true,
      plugins: false,
      parallel: minimalMode ? false : true,
      smartContinue: minimalMode ? false : true,
    };

    const rulebookConfig: RulebookConfig = {
      version: getRulebookVersion(),
      installedAt:
        detection.existingAgents.content?.match(/Generated at: (.+)/)?.[1] ||
        new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: path.basename(cwd),
      mode: minimalMode ? 'minimal' : 'full',
      features: rulebookFeatures,
      coverageThreshold: existingConfig.coverageThreshold ?? 95,
      language: existingConfig.language ?? 'en',
      outputLanguage: existingConfig.outputLanguage ?? 'en',
      cliTools: existingConfig.cliTools ?? [],
      maxParallelTasks: existingConfig.maxParallelTasks ?? 5,
      timeouts: existingConfig.timeouts ?? {
        taskExecution: 3600000,
        cliResponse: 180000,
        testRun: 600000,
      },
      ...(existingConfig.memory ? { memory: existingConfig.memory } : {}),
      ...(existingConfig.ralph ? { ralph: existingConfig.ralph } : {}),
      ...(existingConfig.skills ? { skills: existingConfig.skills } : {}),
      ...(leanMode ? { agentsMode: 'lean' as const } : existingConfig.agentsMode ? { agentsMode: existingConfig.agentsMode } : {}),
    };

    await configManager.saveConfig(rulebookConfig);
    configSpinner.succeed('.rulebook configuration updated');

    // Auto-setup Claude Code integration (MCP + skills)
    const claudeSpinner = ora('Checking Claude Code integration...').start();
    try {
      const { setupClaudeCodeIntegration } = await import('../core/claude-mcp.js');
      const result = await setupClaudeCodeIntegration(cwd);
      if (result.detected) {
        claudeSpinner.succeed('Claude Code integration updated');
        if (result.mcpConfigured) {
          console.log(chalk.gray('  • MCP server added to .mcp.json'));
        }
        if (result.skillsInstalled.length > 0) {
          console.log(
            chalk.gray(`  • ${result.skillsInstalled.length} skills updated in .claude/commands/`)
          );
        }
        if (result.agentTeamsEnabled) {
          console.log(chalk.gray('  • Multi-agent teams enabled in .claude/settings.json'));
        }
        if (result.agentDefinitionsInstalled.length > 0) {
          console.log(
            chalk.gray(
              `  • ${result.agentDefinitionsInstalled.length} agent definitions updated in .claude/agents/`
            )
          );
        }
      } else {
        claudeSpinner.info('Claude Code not detected (skipped)');
      }
    } catch {
      claudeSpinner.info('Claude Code integration skipped');
    }

    // Install/update Ralph shell scripts
    try {
      const { installRalphScripts } = await import('../core/ralph-scripts.js');
      const scripts = await installRalphScripts(cwd);
      if (scripts.length > 0) {
        console.log(chalk.gray(`  • ${scripts.length} Ralph scripts updated in .rulebook/scripts/`));
      }
    } catch {
      // Skip if Ralph scripts installation fails
    }

    // Ensure PLANS.md exists (create if missing, never overwrite)
    try {
      const { initPlans } = await import('../core/plans-manager.js');
      await initPlans(cwd);
    } catch {
      // Non-blocking
    }

    // Migrate memory directory if old structure exists
    try {
      await migrateMemoryDirectory();
    } catch {
      // Silently skip if migration fails
    }

    // Install plugin in Claude Code
    try {
      await setupClaudeCodePlugin();
    } catch {
      // Silently skip if plugin installation fails
    }

    // Clean up any accidental duplicate directories
    try {
      const fsPromises = await import('fs/promises');
      const accidentalDir = path.join(cwd, '.rulebook', '.rulebook');
      if (existsSync(accidentalDir)) {
        await fsPromises.rm(accidentalDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }

    // Success message
    console.log(chalk.bold.green('\n✅ Update complete!\n'));
    console.log(chalk.white('Updated components:'));
    console.log(chalk.green('  ✓ AGENTS.md - Merged with latest templates'));
    console.log(chalk.green(`  ✓ .rulebook - Updated to v${getRulebookVersion()}`));

    console.log(chalk.white('\nWhat was updated:'));
    console.log(chalk.gray(`  - ${detection.languages.length} language templates`));
    console.log(
      chalk.gray(`  - ${detection.modules.filter((m) => m.detected).length} MCP modules`)
    );
    console.log(chalk.gray('  - Git workflow rules'));
    console.log(chalk.gray('  - Rulebook task management'));
    console.log(chalk.gray('  - Pre-commit command standardization'));

    console.log(
      chalk.yellow('\n⚠ Review the updated AGENTS.md to ensure your custom rules are preserved')
    );
    console.log(chalk.white('\nNext steps:'));
    console.log(chalk.gray('  1. Review AGENTS.md changes'));
    console.log(chalk.gray('  2. Test that your project still builds'));
    console.log(chalk.gray('  3. Run quality checks (lint, test, build)'));
    console.log(chalk.gray('  4. Commit the updated files\n'));

    if (minimalMode && minimalArtifacts.length > 0) {
      console.log(chalk.green('Essentials ensured:'));
      for (const artifact of minimalArtifacts) {
        console.log(chalk.gray(`  - ${path.relative(cwd, artifact)}`));
      }
      console.log('');
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Update failed:'), error);
    process.exit(1);
  }
}

// ============================================
// Skills Commands (v2.0)
// ============================================

/**
 * List all available skills
 */
export async function skillListCommand(options: {
  category?: string;
  enabled?: boolean;
}): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora('Discovering skills...').start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    let skills;
    if (options.category) {
      skills = await skillsManager.getSkillsByCategory(options.category as SkillCategory);
    } else {
      skills = await skillsManager.getSkills();
    }

    // Get enabled status from config
    let enabledIds = new Set<string>();
    try {
      const config = await configManager.loadConfig();
      enabledIds = new Set(config.skills?.enabled || []);
    } catch {
      // No config file, all skills disabled
    }

    // Filter by enabled status if requested
    if (options.enabled) {
      skills = skills.filter((s) => enabledIds.has(s.id));
    }

    spinner.succeed(`Found ${skills.length} skill(s)`);

    if (skills.length === 0) {
      console.log(chalk.yellow('\nNo skills found matching criteria.'));
      return;
    }

    // Group by category
    const byCategory = new Map<string, typeof skills>();
    for (const skill of skills) {
      const cat = skill.category;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(skill);
    }

    console.log(chalk.bold.blue('\n📦 Available Skills\n'));

    for (const [category, categorySkills] of byCategory) {
      console.log(chalk.bold.white(`${category.toUpperCase()}`));
      for (const skill of categorySkills) {
        const enabled = enabledIds.has(skill.id);
        const status = enabled ? chalk.green('✓') : chalk.gray('○');
        const name = enabled ? chalk.green(skill.metadata.name) : chalk.white(skill.metadata.name);
        console.log(`  ${status} ${name}`);
        console.log(chalk.gray(`    ${skill.metadata.description}`));
        console.log(chalk.gray(`    ID: ${skill.id}`));
      }
      console.log('');
    }

    console.log(chalk.gray('Use "rulebook skill add <skill-id>" to enable a skill'));
    console.log(chalk.gray('Use "rulebook skill remove <skill-id>" to disable a skill'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to list skills:'), error);
    process.exit(1);
  }
}

/**
 * Add (enable) a skill
 */
export async function skillAddCommand(skillId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Adding skill: ${skillId}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    // Check if skill exists
    const skill = await skillsManager.getSkillById(skillId);
    if (!skill) {
      spinner.fail(`Skill not found: ${skillId}`);

      // Search for similar skills
      const allSkills = await skillsManager.getSkills();
      const similar = allSkills.filter(
        (s) =>
          s.id.includes(skillId.toLowerCase()) ||
          s.metadata.name.toLowerCase().includes(skillId.toLowerCase())
      );

      if (similar.length > 0) {
        console.log(chalk.yellow('\nDid you mean one of these?'));
        for (const s of similar.slice(0, 5)) {
          console.log(chalk.gray(`  - ${s.id} (${s.metadata.name})`));
        }
      }

      console.log(chalk.gray('\nUse "rulebook skill list" to see all available skills'));
      process.exit(1);
    }

    // Load config and enable skill
    let config = await configManager.loadConfig();
    config = await skillsManager.enableSkill(skillId, config);

    // Validate for conflicts
    const validation = await skillsManager.validateSkills(config);
    if (validation.conflicts.length > 0) {
      spinner.warn(`Skill enabled with conflicts`);
      console.log(chalk.yellow('\n⚠️  Conflicts detected:'));
      for (const conflict of validation.conflicts) {
        console.log(chalk.yellow(`  - ${conflict.skillA} conflicts with ${conflict.skillB}`));
        console.log(chalk.gray(`    ${conflict.reason}`));
      }
    } else {
      spinner.succeed(`Skill added: ${skill.metadata.name}`);
    }

    // Save config
    await configManager.saveConfig(config);

    console.log(chalk.green(`\n✓ Skill "${skill.metadata.name}" is now enabled`));
    console.log(chalk.gray(`  Category: ${skill.category}`));
    console.log(chalk.gray(`  Description: ${skill.metadata.description}`));

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      for (const warning of validation.warnings) {
        console.log(chalk.yellow(`  - ${warning}`));
      }
    }

    console.log(chalk.gray('\nRun "rulebook update" to regenerate AGENTS.md with the new skill'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to add skill:'), error);
    process.exit(1);
  }
}

/**
 * Remove (disable) a skill
 */
export async function skillRemoveCommand(skillId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Removing skill: ${skillId}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    // Check if skill exists
    const skill = await skillsManager.getSkillById(skillId);
    if (!skill) {
      spinner.fail(`Skill not found: ${skillId}`);
      console.log(chalk.gray('Use "rulebook skill list" to see all available skills'));
      process.exit(1);
    }

    // Load config
    let config = await configManager.loadConfig();

    // Check if skill is enabled
    if (!config.skills?.enabled?.includes(skillId)) {
      spinner.fail(`Skill "${skillId}" is not currently enabled`);
      process.exit(1);
    }

    // Disable skill
    config = await skillsManager.disableSkill(skillId, config);
    await configManager.saveConfig(config);

    spinner.succeed(`Skill removed: ${skill.metadata.name}`);

    console.log(chalk.green(`\n✓ Skill "${skill.metadata.name}" is now disabled`));
    console.log(chalk.gray('\nRun "rulebook update" to regenerate AGENTS.md without this skill'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to remove skill:'), error);
    process.exit(1);
  }
}

/**
 * Show skill details
 */
export async function skillShowCommand(skillId: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Loading skill: ${skillId}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    const skill = await skillsManager.getSkillById(skillId);
    if (!skill) {
      spinner.fail(`Skill not found: ${skillId}`);

      // Search for similar skills
      const allSkills = await skillsManager.getSkills();
      const similar = allSkills.filter(
        (s) =>
          s.id.includes(skillId.toLowerCase()) ||
          s.metadata.name.toLowerCase().includes(skillId.toLowerCase())
      );

      if (similar.length > 0) {
        console.log(chalk.yellow('\nDid you mean one of these?'));
        for (const s of similar.slice(0, 5)) {
          console.log(chalk.gray(`  - ${s.id} (${s.metadata.name})`));
        }
      }

      process.exit(1);
    }

    spinner.stop();

    // Check if enabled
    let enabled = false;
    try {
      const config = await configManager.loadConfig();
      enabled = config.skills?.enabled?.includes(skillId) || false;
    } catch {
      // No config
    }

    console.log(chalk.bold.blue(`\n📦 ${skill.metadata.name}\n`));
    console.log(chalk.white(`ID: ${skill.id}`));
    console.log(chalk.white(`Category: ${skill.category}`));
    console.log(
      chalk.white(`Status: ${enabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`)
    );

    if (skill.metadata.version) {
      console.log(chalk.white(`Version: ${skill.metadata.version}`));
    }
    if (skill.metadata.author) {
      console.log(chalk.white(`Author: ${skill.metadata.author}`));
    }

    console.log(chalk.white(`\nDescription:`));
    console.log(chalk.gray(`  ${skill.metadata.description}`));

    if (skill.metadata.tags && skill.metadata.tags.length > 0) {
      console.log(chalk.white(`\nTags: ${skill.metadata.tags.join(', ')}`));
    }

    if (skill.metadata.dependencies && skill.metadata.dependencies.length > 0) {
      console.log(chalk.white(`\nDependencies:`));
      for (const dep of skill.metadata.dependencies) {
        console.log(chalk.gray(`  - ${dep}`));
      }
    }

    if (skill.metadata.conflicts && skill.metadata.conflicts.length > 0) {
      console.log(chalk.yellow(`\nConflicts with:`));
      for (const conflict of skill.metadata.conflicts) {
        console.log(chalk.yellow(`  - ${conflict}`));
      }
    }

    // Show preview of content
    console.log(chalk.white(`\nContent Preview:`));
    const preview = skill.content.slice(0, 500);
    console.log(chalk.gray(preview + (skill.content.length > 500 ? '...' : '')));

    console.log(chalk.gray(`\nPath: ${skill.path}`));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to show skill:'), error);
    process.exit(1);
  }
}

/**
 * Search for skills
 */
export async function skillSearchCommand(query: string): Promise<void> {
  try {
    const cwd = process.cwd();
    const spinner = ora(`Searching for: ${query}...`).start();

    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    const skills = await skillsManager.searchSkills(query);

    spinner.succeed(`Found ${skills.length} result(s)`);

    if (skills.length === 0) {
      console.log(chalk.yellow(`\nNo skills found matching "${query}"`));
      console.log(chalk.gray('Try a different search term or use "rulebook skill list"'));
      return;
    }

    // Get enabled status
    let enabledIds = new Set<string>();
    try {
      const config = await configManager.loadConfig();
      enabledIds = new Set(config.skills?.enabled || []);
    } catch {
      // No config
    }

    console.log(chalk.bold.blue(`\n🔍 Search Results for "${query}"\n`));

    for (const skill of skills) {
      const enabled = enabledIds.has(skill.id);
      const status = enabled ? chalk.green('✓') : chalk.gray('○');
      const name = enabled ? chalk.green(skill.metadata.name) : chalk.white(skill.metadata.name);
      console.log(`${status} ${name} (${skill.category})`);
      console.log(chalk.gray(`  ${skill.metadata.description}`));
      console.log(chalk.gray(`  ID: ${skill.id}\n`));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Search failed:'), error);
    process.exit(1);
  }
}

// ============================================
// Memory Commands (v2.2)
// ============================================

export async function memorySearchCommand(
  query: string,
  options: { type?: string; limit?: string; mode?: string }
): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Searching memories...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled. Run: rulebook config --set memory.enabled=true');
      return;
    }

    const { createMemoryManager } = await import('../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);

    const results = await manager.searchMemories({
      query,
      mode: (options.mode as 'bm25' | 'vector' | 'hybrid') || 'hybrid',
      type: options.type as any,
      limit: options.limit ? parseInt(options.limit) : 20,
    });

    spinner.succeed(`Found ${results.length} memories`);

    if (results.length === 0) {
      console.log(chalk.yellow('\nNo memories found for that query.'));
    } else {
      console.log('');
      for (const r of results) {
        const typeColor =
          r.type === 'bugfix' ? chalk.red : r.type === 'feature' ? chalk.green : chalk.blue;
        console.log(
          `  ${typeColor(r.type.padEnd(12))} ${chalk.white(r.title)} ${chalk.gray(`[${r.matchType}] ${r.score.toFixed(3)}`)}`
        );
      }
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Search failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memorySaveCommand(
  text: string,
  options: { type?: string; title?: string; tags?: string }
): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Saving memory...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled. Run: rulebook config --set memory.enabled=true');
      return;
    }

    const { createMemoryManager } = await import('../memory/memory-manager.js');
    const { classifyMemory } = await import('../memory/memory-hooks.js');
    const manager = createMemoryManager(cwd, config.memory);

    const type = (options.type || classifyMemory(text)) as any;
    const title = options.title || text.slice(0, 80);
    const tags = options.tags ? options.tags.split(',').map((t) => t.trim()) : [];

    const memory = await manager.saveMemory({ type, title, content: text, tags });
    spinner.succeed(`Memory saved: ${chalk.cyan(memory.id)}`);
    console.log(chalk.gray(`  Type: ${memory.type} | Title: ${memory.title}`));

    await manager.close();
  } catch (error) {
    spinner.fail('Save failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryListCommand(options: { limit?: string; type?: string }): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Loading memories...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);

    const stats = await manager.getStats();
    const exported = await manager.exportMemories('json');
    const memories = JSON.parse(exported).slice(0, options.limit ? parseInt(options.limit) : 20);

    spinner.succeed(`${stats.memoryCount} memories total`);

    if (memories.length === 0) {
      console.log(chalk.yellow('\nNo memories stored yet.'));
    } else {
      console.log('');
      for (const m of memories) {
        const date = new Date(m.createdAt).toLocaleDateString();
        const typeColor =
          m.type === 'bugfix' ? chalk.red : m.type === 'feature' ? chalk.green : chalk.blue;
        console.log(
          `  ${chalk.gray(date)} ${typeColor(m.type.padEnd(12))} ${chalk.white(m.title)}`
        );
      }
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Failed to list memories');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryStatsCommand(): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Loading stats...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);
    const stats = await manager.getStats();

    spinner.succeed('Memory statistics');

    const sizeMB = (stats.dbSizeBytes / 1024 / 1024).toFixed(2);
    const maxMB = (stats.maxSizeBytes / 1024 / 1024).toFixed(0);
    const usage = stats.usagePercent.toFixed(1);
    const bar =
      '█'.repeat(Math.floor(stats.usagePercent / 5)) +
      '░'.repeat(20 - Math.floor(stats.usagePercent / 5));

    console.log(`\n  Memories:  ${chalk.cyan(stats.memoryCount)}`);
    console.log(`  Sessions:  ${chalk.cyan(stats.sessionCount)}`);
    console.log(`  DB Size:   ${chalk.cyan(sizeMB + ' MB')} / ${maxMB} MB`);
    console.log(
      `  Usage:     [${stats.usagePercent > 80 ? chalk.red(bar) : chalk.green(bar)}] ${usage}%`
    );
    console.log(
      `  Health:    ${stats.indexHealth === 'good' ? chalk.green(stats.indexHealth) : chalk.yellow(stats.indexHealth)}`
    );

    await manager.close();
  } catch (error) {
    spinner.fail('Failed to load stats');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryVerifyCommand(): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Verifying memory system...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    const memoryEnabled = config.memory?.enabled ?? false;
    const dbPathRelative = config.memory?.dbPath ?? '.rulebook/memory/memory.db';
    const dbPathAbsolute = path.join(cwd, dbPathRelative);

    spinner.succeed('Memory verification');

    // Check enabled status
    console.log(
      `\n  ${memoryEnabled ? chalk.green('✓') : chalk.red('✗')} Memory enabled: ${memoryEnabled}`
    );

    // Check DB path
    console.log(`  ${chalk.green('✓')} DB path: ${dbPathRelative}`);

    // Check if file exists on disk
    const fileExists = existsSync(dbPathAbsolute);
    if (fileExists) {
      const { statSync } = await import('fs');
      const fileStat = statSync(dbPathAbsolute);
      const sizeKB = (fileStat.size / 1024).toFixed(1);
      console.log(`  ${chalk.green('✓')} File exists: YES (${sizeKB} KB)`);
    } else {
      console.log(`  ${chalk.red('✗')} File exists: NO`);
    }

    // If memory is enabled and file exists, show record count
    if (memoryEnabled && fileExists) {
      try {
        const { createMemoryManager } = await import('../memory/memory-manager.js');
        const manager = createMemoryManager(cwd, config.memory!);
        const stats = await manager.getStats();
        console.log(`  ${chalk.green('✓')} Record count: ${stats.memoryCount} memories`);
        await manager.close();
      } catch (error) {
        console.log(
          `  ${chalk.yellow('!')} Record count: unable to read (${String(error)})`
        );
      }
    } else if (!memoryEnabled) {
      console.log(
        `  ${chalk.yellow('!')} Enable memory with: ${chalk.bold('rulebook config --feature memory --enable')}`
      );
    }

    console.log('');
  } catch (error) {
    spinner.fail('Memory verification failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryCleanupCommand(options: { force?: boolean }): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Running cleanup...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);
    const result = await manager.cleanup(options.force || false);

    if (result.evictedCount > 0) {
      const freedMB = (result.freedBytes / 1024 / 1024).toFixed(2);
      spinner.succeed(`Cleaned up ${result.evictedCount} memories (freed ${freedMB} MB)`);
    } else {
      spinner.succeed('No cleanup needed');
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Cleanup failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryExportCommand(options: {
  format?: string;
  output?: string;
}): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Exporting memories...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);

    const format = (options.format || 'json') as 'json' | 'csv';
    const exported = await manager.exportMemories(format);
    const count = format === 'json' ? JSON.parse(exported).length : exported.split('\n').length - 1;

    if (options.output) {
      const { writeFile } = await import('fs/promises');
      await writeFile(options.output, exported);
      spinner.succeed(`Exported ${count} memories to ${chalk.cyan(options.output)}`);
    } else {
      spinner.succeed(`Exported ${count} memories`);
      console.log(exported);
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Export failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

// Ralph Autonomous Loop Commands (v3.0)

export async function ralphInitCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Initializing Ralph autonomous loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../core/logger.js');
    const { RalphManager } = await import('../core/ralph-manager.js');
    const { PRDGenerator } = await import('../core/prd-generator.js');
    const { createConfigManager } = await import('../core/config-manager.js');

    const logger = new Logger(cwd);
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    // Create managers
    const ralphManager = new RalphManager(cwd, logger);
    const prdGenerator = new PRDGenerator(cwd, logger);

    // Initialize Ralph
    const maxIterations = config.ralph?.maxIterations || 10;
    const tool = (config.ralph?.tool || 'claude') as 'claude' | 'amp' | 'gemini';

    await ralphManager.initialize(maxIterations, tool);

    // Generate PRD from rulebook tasks
    const prd = await prdGenerator.generatePRD(path.basename(cwd));

    // Save PRD
    const prdPath = path.join(cwd, '.rulebook', 'ralph', 'prd.json');
    await writeFile(prdPath, JSON.stringify(prd, null, 2));

    spinner.succeed(`Ralph initialized: ${prd.userStories.length} user stories loaded`);
    console.log(`\n  📋 PRD: ${prdPath}`);
    console.log(`  🔄 Max iterations: ${maxIterations}`);
    console.log(`  🤖 AI Tool: ${tool}`);
    console.log(`\n  Run: ${chalk.bold('rulebook ralph run')}\n`);
  } catch (error) {
    spinner.fail('Ralph initialization failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphRunCommand(options: {
  maxIterations?: number;
  tool?: 'claude' | 'amp' | 'gemini';
}): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Starting Ralph autonomous loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../core/logger.js');
    const { RalphManager } = await import('../core/ralph-manager.js');
    const { RalphParser } = await import('../agents/ralph-parser.js');
    const { createConfigManager } = await import('../core/config-manager.js');
    const { IterationTracker } = await import('../core/iteration-tracker.js');
    const childProcess = await import('child_process');

    const logger = new Logger(cwd);
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    const ralphManager = new RalphManager(cwd, logger);
    const maxIterations = options.maxIterations || config.ralph?.maxIterations || 10;
    const tool = options.tool || (config.ralph?.tool as 'claude' | 'amp' | 'gemini') || 'claude';

    // Context compression config
    const compressionConfig = config.ralph?.contextCompression;
    const compressionEnabled = compressionConfig?.enabled !== false;
    const compressionRecentCount = compressionConfig?.recentCount ?? 3;
    const compressionThreshold = compressionConfig?.threshold ?? 5;
    const iterationTracker = new IterationTracker(cwd, logger);
    await iterationTracker.initialize();

    await ralphManager.initialize(maxIterations, tool);

    // Create git branch from PRD
    const prd = await ralphManager.loadPRD();
    if (prd?.branchName) {
      await ralphCreateBranch(cwd, prd.branchName);
    }

    // Handle Ctrl+C for graceful pause
    let interrupted = false;
    const handleInterrupt = async () => {
      interrupted = true;
      spinner.warn('Pausing after current iteration...');
      await ralphManager.pause();
    };
    process.on('SIGINT', handleInterrupt);

    // Sync task count from PRD (may have been saved after initialize)
    await ralphManager.refreshTaskCount();

    spinner.text = 'Ralph loop running (Ctrl+C to pause)...';

    let iterationCount = 0;
    while (ralphManager.canContinue() && !interrupted) {
      iterationCount++;
      const task = await ralphManager.getNextTask();

      if (!task) {
        break;
      }

      spinner.stop();
      console.log(chalk.bold.cyan(`\n  ── Iteration ${iterationCount}: ${task.title} ──\n`));

      const startTime = Date.now();

      // 1. Execute AI agent with task context
      let contextHistory = '';
      if (compressionEnabled) {
        contextHistory = await iterationTracker.buildCompressedContext(
          compressionRecentCount,
          compressionThreshold
        );
      }

      // Read PLANS.md context for session scratchpad injection
      let plansContext = '';
      try {
        const { readPlans, plansExists } = await import('../core/plans-manager.js');
        if (plansExists(cwd)) {
          const plans = await readPlans(cwd);
          if (plans?.context && plans.context.trim()) {
            plansContext = plans.context.trim();
          }
        }
      } catch {
        // PLANS.md injection is optional — skip on error
      }

      const prompt = ralphBuildPrompt(task, prd, contextHistory, plansContext);
      let agentOutput = '';
      try {
        agentOutput = await ralphExecuteAgent(tool, prompt, cwd, childProcess.spawn);
      } catch (agentError: any) {
        agentOutput = `Error executing agent: ${agentError.message || agentError}`;
        console.log(chalk.red(`  Agent error: ${agentError.message || agentError}`));
      }

      // 2. Run quality gates
      spinner.start('Running quality gates...');
      const qualityResults = await ralphRunQualityGates(cwd, childProcess.spawn);
      spinner.stop();

      // Print quality gate results
      const gateIcon = (pass: boolean) => (pass ? chalk.green('✓') : chalk.red('✗'));
      console.log(`  ${gateIcon(qualityResults.type_check)} type-check`);
      console.log(`  ${gateIcon(qualityResults.lint)} lint`);
      console.log(`  ${gateIcon(qualityResults.tests)} tests`);
      console.log(`  ${gateIcon(qualityResults.coverage_met)} coverage`);

      const executionTime = Date.now() - startTime;

      // 3. Parse agent output for learnings/errors
      const parsed = RalphParser.parseAgentOutput(
        agentOutput,
        iterationCount,
        task.id,
        task.title,
        tool
      );

      // 4. Determine status from real quality gates
      const allGatesPass =
        qualityResults.type_check &&
        qualityResults.lint &&
        qualityResults.tests &&
        qualityResults.coverage_met;

      const passCount = Object.values(qualityResults).filter(Boolean).length;
      const status: 'success' | 'partial' | 'failed' = allGatesPass
        ? 'success'
        : passCount >= 2
          ? 'partial'
          : 'failed';

      // 5. Git commit if successful
      let gitCommit: string | undefined;
      if (allGatesPass) {
        gitCommit = await ralphGitCommit(cwd, task, iterationCount, childProcess.spawn);
        await ralphManager.markStoryComplete(task.id);
        console.log(chalk.green(`\n  ✅ Story ${task.id} completed`));
      } else {
        console.log(chalk.yellow(`\n  ⚠ Story ${task.id} not completed (quality gates failed)`));
      }

      // 6. Record iteration
      const result = {
        iteration: iterationCount,
        timestamp: new Date().toISOString(),
        task_id: task.id,
        task_title: task.title,
        status,
        ai_tool: tool,
        execution_time_ms: executionTime,
        quality_checks: qualityResults,
        output_summary: parsed.output_summary || `Iteration ${iterationCount}: ${task.title}`,
        git_commit: gitCommit,
        learnings: parsed.learnings,
        errors: parsed.errors,
        metadata: {
          context_loss_count: parsed.metadata.context_loss_count,
          parsed_completion: parsed.metadata.parsed_completion,
        },
      };

      await ralphManager.recordIteration(result);
      spinner.start('Preparing next iteration...');
    }

    // Cleanup
    process.removeListener('SIGINT', handleInterrupt);

    const stats = await ralphManager.getTaskStats();
    spinner.succeed(`Ralph loop complete: ${stats.completed}/${stats.total} tasks completed`);
    console.log(`\n  ✅ Iterations: ${iterationCount}`);
    console.log(`  📊 Completed: ${stats.completed}/${stats.total}`);
    if (interrupted) {
      console.log(
        chalk.yellow(`  ⏸  Paused by user. Resume: ${chalk.bold('rulebook ralph resume')}`)
      );
    }
    console.log(`\n  View history: ${chalk.bold('rulebook ralph history')}\n`);
  } catch (error) {
    spinner.fail('Ralph loop failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

/**
 * Build prompt for AI agent from user story context
 */
function ralphBuildPrompt(task: any, prd: any, contextHistory?: string, plansContext?: string): string {
  const criteria = (task.acceptanceCriteria || []).map((c: string) => `- ${c}`).join('\n');
  return [
    `You are working on project: ${prd?.project || 'unknown'}`,
    ``,
    plansContext ? `## Session Context (PLANS.md)\n${plansContext}\n` : '',
    contextHistory && contextHistory !== 'No iteration history available.'
      ? `## Iteration History\n${contextHistory}\n`
      : '',
    `## Current Task: ${task.title}`,
    `ID: ${task.id}`,
    ``,
    `## Description`,
    task.description,
    ``,
    `## Acceptance Criteria`,
    criteria,
    ``,
    task.notes ? `## Notes\n${task.notes}\n` : '',
    `## Instructions`,
    `1. Implement the changes described above`,
    `2. Ensure all acceptance criteria are met`,
    `3. Run quality checks: type-check, lint, tests`,
    `4. Fix any issues found by quality checks`,
    `5. When done, summarize what was changed`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Execute AI agent and capture output
 */
async function ralphExecuteAgent(
  tool: 'claude' | 'amp' | 'gemini',
  prompt: string,
  cwd: string,
  spawn: typeof import('child_process').spawn
): Promise<string> {
  // Claude: use -p (print mode) with --dangerously-skip-permissions to allow file edits
  // Prompt is passed via stdin to avoid shell escaping issues and arg length limits
  const toolCommands: Record<string, { cmd: string; args: string[]; stdinPrompt: boolean }> = {
    claude: {
      cmd: 'claude',
      args: ['-p', '--dangerously-skip-permissions', '--verbose'],
      stdinPrompt: true,
    },
    amp: { cmd: 'amp', args: ['-p', prompt], stdinPrompt: false },
    gemini: { cmd: 'gemini', args: ['-p', prompt], stdinPrompt: false },
  };

  const config = toolCommands[tool] || toolCommands.claude;

  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';

    const proc = spawn(config.cmd, config.args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    // For Claude, write prompt to stdin then close it
    if (config.stdinPrompt && proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code === 0 || output.length > 0) {
        resolve(output || errorOutput);
      } else {
        reject(new Error(`Agent ${tool} exited with code ${code}: ${errorOutput.slice(0, 500)}`));
      }
    });

    proc.on('error', (err: Error) => {
      reject(new Error(`Failed to start ${tool}: ${err.message}`));
    });

    // 10 minute timeout per iteration
    setTimeout(() => {
      proc.kill('SIGTERM');
      resolve(output || 'Agent execution timed out after 10 minutes');
    }, 600000);
  });
}

/**
 * Run quality gates and return results
 */
async function ralphRunQualityGates(
  cwd: string,
  spawn: typeof import('child_process').spawn
): Promise<{ type_check: boolean; lint: boolean; tests: boolean; coverage_met: boolean }> {
  const runGate = (cmd: string, args: string[]): Promise<boolean> => {
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.on('close', (code: number | null) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });

      // 2 minute timeout per gate
      setTimeout(() => {
        proc.kill('SIGTERM');
        resolve(false);
      }, 120000);
    });
  };

  // Detect monorepo to choose the right test command
  const { detectMonorepo } = await import('../core/detector.js');
  const monorepo = await detectMonorepo(cwd).catch(() => ({ detected: false, tool: null, packages: [] }));

  let testCmd: [string, string[]] = ['npm', ['test']];
  if (monorepo.detected) {
    if (monorepo.tool === 'turborepo') testCmd = ['turbo', ['run', 'test']];
    else if (monorepo.tool === 'nx') testCmd = ['nx', ['run-many', '--target=test']];
  }

  // Run gates in parallel
  const [typeCheck, lint, tests] = await Promise.all([
    runGate('npm', ['run', 'type-check']),
    runGate('npm', ['run', 'lint']),
    runGate(testCmd[0], testCmd[1]),
  ]);

  return {
    type_check: typeCheck,
    lint: lint,
    tests: tests,
    coverage_met: tests,
  };
}

/**
 * Create git branch from PRD branchName
 */
async function ralphCreateBranch(cwd: string, branchName: string): Promise<void> {
  const { readFileSync } = await import('fs');
  const { spawn } = await import('child_process');

  // Check if already on the branch
  try {
    const gitHeadPath = path.join(cwd, '.git', 'HEAD');
    const head = readFileSync(gitHeadPath, 'utf8').trim();
    const currentBranch = head.replace('ref: refs/heads/', '');

    if (currentBranch === branchName) {
      return;
    }
  } catch {
    return;
  }

  // Create or checkout branch
  await new Promise<void>((resolve) => {
    const proc = spawn('git', ['checkout', '-B', branchName], {
      cwd,
      shell: true,
      stdio: 'pipe',
    });
    proc.on('close', () => resolve());
    proc.on('error', () => resolve());
  });
}

/**
 * Commit changes after successful iteration
 */
async function ralphGitCommit(
  cwd: string,
  task: any,
  iteration: number,
  spawn: typeof import('child_process').spawn
): Promise<string | undefined> {
  // Stage all changes
  await new Promise<void>((resolve) => {
    const proc = spawn('git', ['add', '-A'], { cwd, shell: true, stdio: 'pipe' });
    proc.on('close', () => resolve());
    proc.on('error', () => resolve());
  });

  // Check if there are staged changes
  const hasChanges = await new Promise<boolean>((resolve) => {
    let output = '';
    const proc = spawn('git', ['diff', '--cached', '--stat'], {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });
    proc.on('close', () => resolve(output.trim().length > 0));
    proc.on('error', () => resolve(false));
  });

  if (!hasChanges) {
    return undefined;
  }

  // Commit with Ralph message
  const commitMsg = `ralph(${task.id}): ${task.title}\n\nIteration ${iteration} - Ralph autonomous loop`;
  const commitHash = await new Promise<string | undefined>((resolve) => {
    let output = '';
    const proc = spawn('git', ['commit', '-m', commitMsg], {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });
    proc.on('close', (code: number | null) => {
      if (code === 0) {
        const hashMatch = output.match(/\[[\w/.-]+ ([a-f0-9]+)\]/);
        resolve(hashMatch ? hashMatch[1] : undefined);
      } else {
        resolve(undefined);
      }
    });
    proc.on('error', () => resolve(undefined));
  });

  return commitHash;
}

export async function ralphStatusCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Loading Ralph status...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../core/logger.js');
    const { RalphManager } = await import('../core/ralph-manager.js');

    const logger = new Logger(cwd);
    const ralphManager = new RalphManager(cwd, logger);
    const status = await ralphManager.getStatus();

    if (!status) {
      spinner.fail('Ralph not initialized');
      console.log(`\n  Run: ${chalk.bold('rulebook ralph init')}\n`);
      return;
    }

    spinner.stop();

    // Show agentsMode from config
    const { createConfigManager } = await import('../core/config-manager.js');
    const configManager = createConfigManager(cwd);
    const cfg = await configManager.loadConfig();
    const agentsMode = cfg.agentsMode ?? 'full';

    console.log(`\n  ${chalk.bold('Ralph Loop Status')}`);
    console.log(`  Iteration:    ${status.current_iteration}/${status.max_iterations}`);
    console.log(`  Tasks:        ${status.completed_tasks}/${status.total_tasks}`);
    console.log(
      `  Status:       ${status.paused ? chalk.yellow('PAUSED') : chalk.green('RUNNING')}`
    );
    console.log(`  AI Tool:      ${status.tool}`);
    console.log(`  Started:      ${new Date(status.started_at).toLocaleString()}`);
    console.log(`  Agents Mode:  ${agentsMode === 'lean' ? chalk.cyan('lean') : chalk.gray('full')} (rulebook mode set lean|full)`);
    console.log();
  } catch (error) {
    spinner.fail('Failed to load status');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphHistoryCommand(options: { limit?: number }): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Loading iteration history...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../core/logger.js');
    const { IterationTracker } = await import('../core/iteration-tracker.js');

    const logger = new Logger(cwd);
    const tracker = new IterationTracker(cwd, logger);
    const limit = options.limit || 10;
    const history = await tracker.getHistory(limit);

    if (history.length === 0) {
      spinner.fail('No iteration history found');
      return;
    }

    spinner.stop();
    console.log(`\n  ${chalk.bold('Recent Iterations')} (${history.length})\n`);

    for (const iter of history) {
      const statusIcon =
        iter.status === 'success'
          ? chalk.green('✓')
          : iter.status === 'partial'
            ? chalk.yellow('◐')
            : chalk.red('✗');
      console.log(`  ${statusIcon} Iteration ${iter.iteration}: ${iter.task_title}`);
      console.log(`     Status: ${iter.status} | Duration: ${(iter.duration_ms || 0) / 1000}s`);
      console.log(
        `     Checks: type=${iter.quality_checks.type_check ? '✓' : '✗'} lint=${iter.quality_checks.lint ? '✓' : '✗'} tests=${iter.quality_checks.tests ? '✓' : '✗'}`
      );
      if (iter.git_commit) {
        console.log(`     Commit: ${iter.git_commit}`);
      }
      console.log();
    }

    // Show statistics
    const stats = await tracker.getStatistics();
    console.log(`  ${chalk.bold('Statistics')}`);
    console.log(
      `  Total: ${stats.total_iterations} | Success: ${stats.successful_iterations} | Failed: ${stats.failed_iterations}`
    );
    console.log(`  Success rate: ${(stats.success_rate * 100).toFixed(1)}%`);
    console.log(`  Avg duration: ${stats.average_duration_ms}ms\n`);
  } catch (error) {
    spinner.fail('Failed to load history');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphPauseCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Pausing Ralph loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../core/logger.js');
    const { RalphManager } = await import('../core/ralph-manager.js');

    const logger = new Logger(cwd);
    const ralphManager = new RalphManager(cwd, logger);
    const status = await ralphManager.getStatus();

    if (!status) {
      spinner.fail('Ralph not initialized');
      console.log(`\n  Run: ${chalk.bold('rulebook ralph init')}\n`);
      return;
    }

    await ralphManager.pause();

    spinner.succeed('Ralph loop paused');
    console.log(`\n  Resume with: ${chalk.bold('rulebook ralph resume')}\n`);
  } catch (error) {
    spinner.fail('Failed to pause');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphResumeCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Resuming Ralph loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../core/logger.js');
    const { RalphManager } = await import('../core/ralph-manager.js');

    const logger = new Logger(cwd);
    const ralphManager = new RalphManager(cwd, logger);
    const status = await ralphManager.getStatus();

    if (!status) {
      spinner.fail('Ralph not initialized');
      console.log(`\n  Run: ${chalk.bold('rulebook ralph init')}\n`);
      return;
    }

    await ralphManager.resume();

    spinner.succeed('Ralph loop resumed');
    console.log(`\n  Continue loop: ${chalk.bold('rulebook ralph run')}\n`);
  } catch (error) {
    spinner.fail('Failed to resume');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function setupClaudeCodePlugin(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Setting up Claude Code plugin...').start();

  try {
    const { readFile } = await import('../utils/file-system.js');
    const os = await import('os');
    const fs = await import('fs/promises');
    const url = await import('url');

    // Get plugin info from .claude-plugin/plugin.json relative to this module
    const packageDir = path.dirname(url.fileURLToPath(import.meta.url));
    const pluginJsonPath = path.join(packageDir, '..', '..', '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(await readFile(pluginJsonPath));

    // Get Claude Code plugins directory
    const homeDir = os.homedir();
    const pluginsDir = path.join(homeDir, '.claude', 'plugins');
    const installCountsPath = path.join(pluginsDir, 'install-counts-cache.json');
    const installedPluginsPath = path.join(pluginsDir, 'installed_plugins.json');

    // Create plugins directory if it doesn't exist
    await fs.mkdir(pluginsDir, { recursive: true });

    // Load or create installed_plugins.json
    let installedPlugins: { version: number; plugins: Record<string, unknown[]> } = {
      version: 2,
      plugins: {},
    };

    if (existsSync(installedPluginsPath)) {
      const content = await readFile(installedPluginsPath);
      installedPlugins = JSON.parse(content);
    }

    // Add rulebook plugin
    const pluginKey = `rulebook@hivehub`;
    const version = pluginJson.version || '3.2.1';
    const installPath = path.join(pluginsDir, 'cache', 'hivehub', 'rulebook', version);

    if (!installedPlugins.plugins[pluginKey]) {
      installedPlugins.plugins[pluginKey] = [];
    }

    // Check if already installed
    const existing = (installedPlugins.plugins[pluginKey] as { version: string }[]).find(
      (p) => p.version === version
    );
    if (!existing) {
      (installedPlugins.plugins[pluginKey] as Record<string, unknown>[]).push({
        scope: 'user',
        installPath: installPath,
        version: version,
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
    }

    // Save installed_plugins.json
    await fs.writeFile(installedPluginsPath, JSON.stringify(installedPlugins, null, 2));

    // Update install-counts-cache.json
    let installCounts: Record<string, number> = {};
    if (existsSync(installCountsPath)) {
      const content = await readFile(installCountsPath);
      installCounts = JSON.parse(content);
    }
    installCounts[pluginKey] = (installCounts[pluginKey] || 0) + 1;
    await fs.writeFile(installCountsPath, JSON.stringify(installCounts, null, 2));

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

// ─── Plans Commands ────────────────────────────────────────────────────────

/**
 * Add sequential-thinking MCP server entry to mcp.json (or .cursor/mcp.json).
 * Non-destructive: skips if already present.
 */
async function addSequentialThinkingMcp(cwd: string): Promise<void> {
  const { readFileSync, writeFileSync, existsSync } = await import('fs');
  const { mkdirSync } = await import('fs');

  const seqEntry = {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  };

  const candidates = [
    path.join(cwd, 'mcp.json'),
    path.join(cwd, '.cursor', 'mcp.json'),
    path.join(cwd, '.mcp.json'),
  ];

  // Find existing mcp.json or default to mcp.json
  let mcpPath = candidates.find((p) => existsSync(p)) ?? path.join(cwd, 'mcp.json');

  let mcpConfig: { mcpServers?: Record<string, unknown> } = {};
  if (existsSync(mcpPath)) {
    try {
      mcpConfig = JSON.parse(readFileSync(mcpPath, 'utf8'));
    } catch {
      mcpConfig = {};
    }
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers ?? {};

  // Already configured under any key variant
  const keys = Object.keys(mcpConfig.mcpServers);
  const alreadyPresent = keys.some((k) =>
    ['sequential-thinking', 'sequential_thinking', 'sequentialThinking'].includes(k)
  );
  if (alreadyPresent) return;

  mcpConfig.mcpServers['sequential-thinking'] = seqEntry;

  // Ensure directory exists
  const dir = path.dirname(mcpPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + '\n');
}

/**
 * Show contents of AGENTS.override.md.
 */
export async function overrideShowCommand(): Promise<void> {
  const cwd = process.cwd();
  const { overrideExists, getOverridePath, readOverrideContent } = await import('../core/override-manager.js');
  if (!overrideExists(cwd)) {
    console.log(chalk.yellow('AGENTS.override.md does not exist. Run `rulebook override edit` or `rulebook init` to create it.'));
    return;
  }
  const content = await readOverrideContent(cwd);
  if (!content) {
    console.log(chalk.gray('AGENTS.override.md exists but has no custom content yet.'));
    console.log(chalk.gray(`  Path: ${getOverridePath(cwd)}`));
    return;
  }
  console.log(chalk.bold('\n📄 AGENTS.override.md\n'));
  console.log(content);
  console.log();
}

/**
 * Open AGENTS.override.md in $EDITOR, or print path if no EDITOR.
 */
export async function overrideEditCommand(): Promise<void> {
  const cwd = process.cwd();
  const { initOverride, getOverridePath } = await import('../core/override-manager.js');
  await initOverride(cwd); // create if missing
  const overridePath = getOverridePath(cwd);
  const editor = process.env.EDITOR || process.env.VISUAL;
  if (editor) {
    const { spawn } = await import('child_process');
    const proc = spawn(editor, [overridePath], { stdio: 'inherit', shell: true });
    await new Promise<void>((resolve) => proc.on('close', () => resolve()));
  } else {
    console.log(chalk.gray(`No $EDITOR set. Edit the file directly:`));
    console.log(chalk.cyan(`  ${overridePath}`));
  }
}

/**
 * Reset AGENTS.override.md to empty template.
 */
export async function overrideClearCommand(): Promise<void> {
  const cwd = process.cwd();
  const { clearOverride } = await import('../core/override-manager.js');
  await clearOverride(cwd);
  console.log(chalk.green('✓ AGENTS.override.md reset to empty template'));
}

/**
 * Set the AGENTS.md generation mode (lean or full).
 */
export async function modeSetCommand(mode: 'lean' | 'full'): Promise<void> {
  const cwd = process.cwd();
  const { createConfigManager } = await import('../core/config-manager.js');
  const configManager = createConfigManager(cwd);
  const config = await configManager.loadConfig();
  config.agentsMode = mode;
  await configManager.saveConfig(config);
  console.log(chalk.green(`✓ AGENTS.md mode set to: ${chalk.bold(mode)}`));
  if (mode === 'lean') {
    console.log(
      chalk.gray(
        '  Lean mode: AGENTS.md will be a lightweight index (<3KB).\n' +
          '  Run `rulebook update` to regenerate AGENTS.md.'
      )
    );
  } else {
    console.log(
      chalk.gray(
        '  Full mode: AGENTS.md will include all rules inline.\n' +
          '  Run `rulebook update` to regenerate AGENTS.md.'
      )
    );
  }
}

/**
 * Show current PLANS.md content.
 */
export async function plansShowCommand(): Promise<void> {
  const { readPlans, getPlansPath } = await import('../core/plans-manager.js');
  const cwd = process.cwd();

  const plans = await readPlans(cwd);
  if (!plans) {
    console.log(chalk.yellow(`No PLANS.md found at ${getPlansPath(cwd)}`));
    console.log(chalk.gray('Run `rulebook plans init` to create one.'));
    return;
  }

  console.log(chalk.bold.blue('\n📋 PLANS.md — Session Scratchpad\n'));

  if (plans.context && plans.context !== '_No active context. Start a session to populate this section._') {
    console.log(chalk.bold('Active Context:'));
    console.log(chalk.white(plans.context));
  }

  if (plans.currentTask && plans.currentTask !== '_No task in progress._') {
    console.log(chalk.bold('\nCurrent Task:'));
    console.log(chalk.cyan(plans.currentTask));
  }

  if (plans.history) {
    console.log(chalk.bold('\nSession History:'));
    console.log(chalk.gray(plans.history));
  }

  console.log('');
}

/**
 * Initialize PLANS.md in project root.
 */
export async function plansInitCommand(): Promise<void> {
  const { initPlans, getPlansPath } = await import('../core/plans-manager.js');
  const cwd = process.cwd();

  const created = await initPlans(cwd);
  if (created) {
    console.log(chalk.green(`✓ Created ${getPlansPath(cwd)}`));
    console.log(chalk.gray('  AI agents will use this file for session continuity.'));
  } else {
    console.log(chalk.yellow(`PLANS.md already exists at ${getPlansPath(cwd)}`));
  }
}

/**
 * Reset PLANS.md to the empty template.
 */
export async function plansClearCommand(): Promise<void> {
  const { clearPlans, getPlansPath } = await import('../core/plans-manager.js');
  const cwd = process.cwd();
  await clearPlans(cwd);
  console.log(chalk.green(`✓ Cleared ${getPlansPath(cwd)}`));
  console.log(chalk.gray('  Session history and context have been reset.'));
}

// ─── Continue Command ───────────────────────────────────────────────────────

/**
 * `rulebook continue` — Print orientations to resume work in a new AI session.
 *
 * Aggregates context from:
 * 1. PLANS.md (session scratchpad)
 * 2. Active rulebook tasks (pending items in tasks.md)
 * 3. Recent git commits (last 5)
 * 4. Ralph status (if running)
 *
 * Outputs a structured prompt that the AI agent can paste at the start of a session.
 */
export async function continueCommand(): Promise<void> {
  const cwd = process.cwd();
  const { readPlans } = await import('../core/plans-manager.js');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  const fs = await import('fs/promises');

  console.log(chalk.bold.blue('\n🔄 Generating session continuity context...\n'));

  const sections: string[] = [];

  // ── 1. PLANS.md context ──
  const plans = await readPlans(cwd);
  if (plans && (plans.context || plans.currentTask)) {
    const plansParts: string[] = ['## Active Plans'];
    if (plans.context && !plans.context.includes('_No active context')) {
      plansParts.push(plans.context);
    }
    if (plans.currentTask && !plans.currentTask.includes('_No task')) {
      plansParts.push(`**Current Task:** ${plans.currentTask}`);
    }
    sections.push(plansParts.join('\n'));
  }

  // ── 2. Active tasks (pending checklist items) ──
  const tasksDir = path.join(cwd, '.rulebook', 'tasks');
  if (existsSync(tasksDir)) {
    const taskSummaries: string[] = [];
    try {
      const entries = await fs.readdir(tasksDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'archive') continue;
        const tasksPath = path.join(tasksDir, entry.name, 'tasks.md');
        if (!existsSync(tasksPath)) continue;
        const content = await fs.readFile(tasksPath, 'utf-8');
        const pending = content
          .split('\n')
          .filter((l) => l.match(/^- \[ \]/))
          .map((l) => l.replace(/^- \[ \]\s*/, '').trim())
          .slice(0, 3);
        if (pending.length > 0) {
          taskSummaries.push(`**${entry.name}** (${pending.length}+ pending):`);
          pending.forEach((p) => taskSummaries.push(`  - ${p}`));
        }
      }
    } catch {
      // ignore
    }
    if (taskSummaries.length > 0) {
      sections.push('## Pending Tasks\n' + taskSummaries.join('\n'));
    }
  }

  // ── 3. Recent git commits ──
  try {
    const { stdout } = await execAsync('git log --oneline -8', { cwd });
    if (stdout.trim()) {
      sections.push('## Recent Commits\n```\n' + stdout.trim() + '\n```');
    }
  } catch {
    // not a git repo or git not available
  }

  // ── 4. Ralph status ──
  const ralphStatePath = path.join(cwd, '.rulebook', 'ralph', 'state.json');
  if (existsSync(ralphStatePath)) {
    try {
      const state = JSON.parse(await fs.readFile(ralphStatePath, 'utf-8'));
      if (state.enabled) {
        const prdPath = path.join(cwd, '.rulebook', 'ralph', 'prd.json');
        let prdInfo = '';
        if (existsSync(prdPath)) {
          const prd = JSON.parse(await fs.readFile(prdPath, 'utf-8'));
          const pending = (prd.userStories ?? []).filter((s: any) => !s.passes).length;
          const total = (prd.userStories ?? []).length;
          prdInfo = ` | ${total - pending}/${total} stories complete`;
        }
        sections.push(
          `## Ralph Status\n` +
          `Iteration ${state.current_iteration}/${state.max_iterations}${prdInfo} | Tool: ${state.tool} | Paused: ${state.paused}`
        );
      }
    } catch {
      // ignore
    }
  }

  // ── 5. Current branch ──
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd });
    const branch = stdout.trim();
    if (branch) {
      sections.unshift(`## Branch\n\`${branch}\``);
    }
  } catch {
    // ignore
  }

  // ── Render ──
  if (sections.length === 0) {
    console.log(chalk.yellow('No session context found. Create tasks, a PLANS.md, or make some commits.'));
    return;
  }

  const output = [
    '─'.repeat(60),
    chalk.bold('📋 SESSION CONTINUITY CONTEXT'),
    chalk.gray('Paste this at the start of a new AI session:'),
    '─'.repeat(60),
    '',
    sections.join('\n\n'),
    '',
    '─'.repeat(60),
  ].join('\n');

  console.log(output);

  // Also write to PLANS.md if it exists
  if (plans !== null) {
    const { appendPlansHistory } = await import('../core/plans-manager.js');
    try {
      await appendPlansHistory(
        cwd,
        `Session context generated. Branch: current. Pending tasks summarized.`
      );
    } catch {
      // non-critical
    }
  }
}

export async function migrateMemoryDirectory(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Migrating memory directory structure...').start();

  try {
    const { createConfigManager } = await import('../core/config-manager.js');
    const fs = await import('fs');
    const fsPromises = fs.promises;
    const cwd = process.cwd();

    const oldDir = path.join(cwd, '.rulebook-memory');
    const rulebookDir = path.join(cwd, '.rulebook');
    const newDir = path.join(rulebookDir, 'memory');

    // Check if old directory exists
    if (!existsSync(oldDir)) {
      spinner.info('No old memory directory found (.rulebook-memory)');
      return;
    }

    // Create .rulebook directory if it doesn't exist
    if (!existsSync(rulebookDir)) {
      await fsPromises.mkdir(rulebookDir, { recursive: true });
    }

    // Create memory subdirectory
    await fsPromises.mkdir(newDir, { recursive: true });

    // Copy files from old to new
    const files = await fsPromises.readdir(oldDir);
    for (const file of files) {
      const oldPath = path.join(oldDir, file);
      const newPath = path.join(newDir, file);
      await fsPromises.copyFile(oldPath, newPath);
    }

    // Remove old directory
    await fsPromises.rm(oldDir, { recursive: true, force: true });

    // Update config to use new path
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
    const oraModule = await import('ora');
    const ora = oraModule.default;
    const spinner2 = ora();
    spinner2.fail('Failed to migrate memory directory');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}
