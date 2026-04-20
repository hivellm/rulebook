import chalk from 'chalk';
import ora from 'ora';
import { detectProject } from '../../core/detector.js';
import { generateFullAgents } from '../../core/generator.js';
import { mergeFullAgents, mergeClaudeMd } from '../../core/merger.js';
import {
  generateWorkflows,
  generateIDEFiles,
  generateAICLIFiles,
} from '../../core/workflow-generator.js';
import { writeFile, ensureDir } from '../../utils/file-system.js';
import { existsSync } from 'fs';
import { parseRulesIgnore } from '../../utils/rulesignore.js';
import { installGitHooks } from '../../utils/git-hooks.js';
import type {
  LanguageDetection,
  ProjectConfig,
  FrameworkId,
  ModuleDetection,
  ServiceId,
} from '../../types.js';
import { scaffoldMinimalProject } from '../../core/minimal-scaffolder.js';
import path from 'path';
import { SkillsManager, getDefaultTemplatesPath } from '../../core/skills-manager.js';
import { WorkspaceManager } from '../../core/workspace/workspace-manager.js';

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

/**
 * Add sequential-thinking MCP server entry to mcp.json (or .cursor/mcp.json).
 * Non-destructive: skips if already present.
 */
export async function addSequentialThinkingMcp(cwd: string): Promise<void> {
  const { readFileSync, writeFileSync, existsSync: fsExists } = await import('fs');
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

  let mcpPath = candidates.find((p) => fsExists(p)) ?? path.join(cwd, 'mcp.json');

  let mcpConfig: { mcpServers?: Record<string, unknown> } = {};
  if (fsExists(mcpPath)) {
    try {
      mcpConfig = JSON.parse(readFileSync(mcpPath, 'utf8'));
    } catch {
      mcpConfig = {};
    }
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers ?? {};

  const keys = Object.keys(mcpConfig.mcpServers);
  const alreadyPresent = keys.some((k) =>
    ['sequential-thinking', 'sequential_thinking', 'sequentialThinking'].includes(k)
  );
  if (alreadyPresent) return;

  mcpConfig.mcpServers['sequential-thinking'] = seqEntry;

  const dir = path.dirname(mcpPath);
  if (!fsExists(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + '\n');
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

    const spinner = ora('Detecting project structure...').start();
    const detection = await detectProject(cwd);
    spinner.succeed('Project detection complete');

    const { assessComplexity } = await import('../../core/complexity-detector.js');
    const complexity = assessComplexity(cwd);
    console.log(
      chalk.gray(
        `  Complexity: ${complexity.tier.toUpperCase()} (${complexity.metrics.estimatedLoc.toLocaleString()} LOC, ${complexity.metrics.languageCount} languages)`
      )
    );

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

    if (detection.monorepo?.detected) {
      const mono = detection.monorepo;
      console.log(chalk.green(`\n✓ Monorepo detected: ${chalk.bold(mono.tool ?? 'manual')}`));
      if (mono.packages.length > 0) {
        console.log(
          `  Packages (${mono.packages.length}): ${mono.packages.slice(0, 5).join(', ')}${mono.packages.length > 5 ? ` +${mono.packages.length - 5} more` : ''}`
        );
      }
      if (options.package) {
        console.log(chalk.cyan(`  → Initializing package: ${options.package}`));
      }
    }

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

    const cliMinimal = Boolean(options.minimal);
    const cliLight = Boolean(options.light);
    const cliLean = Boolean(options.lean);

    const config: ProjectConfig = {
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
      modular: true,
    };
    console.log(chalk.blue('\nAuto-configuring from detection results...'));

    const minimalMode = config.minimal ?? cliMinimal;
    config.minimal = minimalMode;
    config.modules = minimalMode ? [] : config.modules || [];
    config.frameworks = config.frameworks || [];
    config.ides = minimalMode ? [] : config.ides || ['cursor'];
    config.includeGitWorkflow = config.includeGitWorkflow ?? true;
    config.generateWorkflows = config.generateWorkflows ?? true;
    config.modular = config.modular ?? true;
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

    const rulesIgnore = await parseRulesIgnore(cwd);
    if (rulesIgnore.patterns.length > 0) {
      console.log(chalk.yellow('\n📋 Found .rulesignore with patterns:'));
      for (const pattern of rulesIgnore.patterns) {
        console.log(`  - ${pattern}`);
      }
    }

    const { createConfigManager } = await import('../../core/config-manager.js');
    const configManager = createConfigManager(cwd);

    const dirMigrationSpinner = ora('Migrating directory structure...').start();
    await configManager.migrateDirectoryStructure(cwd);
    dirMigrationSpinner.succeed('Directory structure migrated');

    await ensureDir(path.join(cwd, '.rulebook', 'memory'));
    await configManager.ensureGitignore();

    let enabledSkills: string[] = [];
    try {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);

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

    if (options.package) {
      const packageRoot = path.join(cwd, options.package);
      const { generatePackageAgentsMd } = await import('../../core/generator.js');
      await generatePackageAgentsMd(packageRoot, config, cwd);
      console.log(chalk.green(`\n✅ AGENTS.md generated for package: ${options.package}`));
      return;
    }

    const agentsPath = path.join(cwd, 'AGENTS.md');
    let finalContent: string;

    if (detection.existingAgents) {
      {
        const { hasFlatLayout, migrateFlatToSpecs } = await import('../../core/migrator.js');
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

      const mergeSpinner = ora('Merging with existing AGENTS.md...').start();
      finalContent = await mergeFullAgents(detection.existingAgents, config, cwd);
      const { createBackup } = await import('../../utils/file-system.js');
      const backupPath = await createBackup(agentsPath);
      mergeSpinner.succeed(`Backup created: ${path.basename(backupPath)}`);
    } else {
      const genSpinner = ora('Generating AGENTS.md...').start();
      finalContent = await generateFullAgents(config, cwd);
      genSpinner.succeed('AGENTS.md generated');
    }

    await writeFile(agentsPath, finalContent);
    console.log(chalk.green(`\n✅ AGENTS.md written to ${agentsPath}`));

    {
      const { installRule, projectRules } = await import('../../core/rule-engine.js');
      const { getTemplatesDir } = await import('../../core/generator.js');
      const templatesDir = getTemplatesDir();

      const tier1Rules = [
        'no-shortcuts',
        'git-safety',
        'sequential-editing',
        'research-first',
        'follow-task-sequence',
        'incremental-implementation',
      ];
      const tier2Rules = [
        'task-decomposition',
        'incremental-tests',
        'no-deferred',
        'session-workflow',
      ];

      const rulesToInstall = [...tier1Rules];
      if (complexity.recommendations.tier2Rules) {
        rulesToInstall.push(...tier2Rules);
      }

      let installedCount = 0;
      for (const name of rulesToInstall) {
        const result = await installRule(cwd, name, templatesDir);
        if (result) installedCount++;
      }

      if (installedCount > 0) {
        console.log(
          chalk.gray(`  • Installed ${installedCount} canonical rules to .rulebook/rules/`)
        );
      }

      const ruleResult = await projectRules(cwd, {
        claudeCode:
          existsSync(path.join(cwd, '.claude')) || existsSync(path.join(cwd, 'CLAUDE.md')),
        cursor: detection.cursor?.detected,
        gemini: detection.geminiCli?.detected,
        windsurf: detection.windsurf?.detected,
        copilot: detection.githubCopilot?.detected,
        continueDev: detection.continueDev?.detected,
      });

      const totalProjected =
        ruleResult.claudeCode.length +
        ruleResult.cursor.length +
        ruleResult.gemini.length +
        ruleResult.copilot.length +
        ruleResult.windsurf.length +
        ruleResult.continueDev.length;

      if (totalProjected > 0) {
        console.log(chalk.gray(`  • Projected rules to ${totalProjected} tool-specific files`));
      }
    }

    if (detection.cursor?.detected) {
      if (detection.cursor.hasMdcRules) {
        console.log(chalk.gray('  • Cursor .mdc rules updated in .cursor/rules/'));
      } else {
        console.log(chalk.gray('  • Cursor .mdc rules generated in .cursor/rules/'));
      }
    }

    if (detection.geminiCli?.detected) {
      console.log(chalk.gray('  • Gemini CLI config generated: GEMINI.md'));
    }
    if (detection.continueDev?.detected) {
      console.log(chalk.gray('  • Continue.dev rules generated in .continue/rules/'));
    }
    if (detection.windsurf?.detected) {
      console.log(chalk.gray('  • Windsurf rules generated: .windsurfrules'));
    }
    if (detection.githubCopilot?.detected) {
      console.log(chalk.gray('  • GitHub Copilot instructions generated in .github/'));
    }

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

    const gitignoreSpinner = ora('Generating/updating .gitignore...').start();
    const { generateGitignore } = await import('../../core/gitignore-generator.js');
    const gitignoreResult = await generateGitignore(cwd, detection.languages);

    if (gitignoreResult.created) {
      gitignoreSpinner.succeed('.gitignore created');
    } else if (gitignoreResult.updated) {
      gitignoreSpinner.succeed('.gitignore updated with missing patterns');
    } else {
      gitignoreSpinner.info('.gitignore already contains all necessary patterns');
    }

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

    if (!minimalMode) {
      const claudeSpinner = ora('Generating CLAUDE.md (v5.3.0 @import format)...').start();
      try {
        const result = await mergeClaudeMd(cwd);
        const label =
          result.mode === 'create'
            ? 'created'
            : result.mode === 'replace'
              ? 'updated'
              : 'migrated (legacy directives moved to AGENTS.override.md)';
        claudeSpinner.succeed(`CLAUDE.md ${label}`);
        if (result.backupPath) {
          console.log(chalk.gray(`  - backup: ${path.relative(cwd, result.backupPath)}`));
        }
        if (result.mode === 'migrate' && result.overridePath) {
          console.log(
            chalk.yellow(
              `  ! Your previous CLAUDE.md directives were migrated to ${path.relative(cwd, result.overridePath)}.`
            )
          );
          console.log(
            chalk.yellow(
              '    Claude Code still loads them at session start via @AGENTS.override.md.'
            )
          );
          console.log(
            chalk.yellow(
              '    Review and prune AGENTS.override.md when convenient — rulebook will never overwrite it.'
            )
          );
        }
      } catch (err) {
        claudeSpinner.warn(
          `CLAUDE.md generation skipped: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      try {
        const { ensureDir: ensureDirUtil } = await import('../../utils/file-system.js');
        await ensureDirUtil(path.join(cwd, '.rulebook', 'handoff'));
      } catch {
        // non-fatal
      }

      try {
        const { ensureGitignoreEntries } = await import('../../utils/gitignore.js');
        const localMdPath = path.join(cwd, 'CLAUDE.local.md');
        if (!existsSync(localMdPath)) {
          const stub = [
            '# CLAUDE.local.md',
            '',
            '<!-- Personal per-project overrides. Not committed to version control. -->',
            '<!-- Loaded alongside CLAUDE.md with the same priority. -->',
            '',
            '# Add your personal preferences below. Examples:',
            '# - Preferred test data or sandbox URLs',
            '# - Personal tooling shortcuts',
            '# - Debugging tips specific to your machine',
            '',
          ].join('\n');
          const { writeFile: wf } = await import('../../utils/file-system.js');
          await wf(localMdPath, stub);
          console.log(chalk.gray('  • created CLAUDE.local.md (personal overrides, gitignored)'));
        }
        await ensureGitignoreEntries(cwd, [
          'CLAUDE.local.md',
          '.rulebook/backup/',
          '.rulebook/handoff/_pending.md',
          '.rulebook/handoff/.urgent',
        ]);
      } catch {
        // non-fatal
      }

      try {
        const { seedCompactContext } = await import('../../core/compact-context-manager.js');
        const seedResult = await seedCompactContext(cwd, { languages: detection.languages });
        if (seedResult.seeded) {
          console.log(chalk.gray(`  • seeded ${path.relative(cwd, seedResult.path)}`));
        }
      } catch (err) {
        console.log(
          chalk.gray(
            `  · COMPACT_CONTEXT seed skipped: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }

      try {
        const { applyClaudeSettings } = await import('../../core/claude-settings-manager.js');
        const rulebookCfg = await configManager.loadConfig();
        const multiAgentEnabled = rulebookCfg?.multiAgent?.enabled ?? false;
        const handoffEnabled = rulebookCfg?.handoff?.enabled ?? true;
        const terseEnabled = rulebookCfg?.terse?.enabled ?? true;
        await applyClaudeSettings(cwd, {
          teamEnforcement: multiAgentEnabled,
          sessionHandoff: handoffEnabled,
          compactContextReinject: true,
          qualityEnforcement: true,
          terseMode: terseEnabled,
        });
      } catch (err) {
        console.log(
          chalk.gray(
            `  · .claude/settings.json skipped: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }

      try {
        const { generateMcpReference } = await import('../../core/mcp-reference-generator.js');
        const mcpRef = await generateMcpReference(cwd);
        if (mcpRef.written) {
          console.log(chalk.gray(`  • generated ${path.relative(cwd, mcpRef.path)}`));
        }
      } catch {
        // non-fatal
      }

      const rulesSpinner = ora(
        'Generating path-scoped .claude/rules/ for detected languages...'
      ).start();
      try {
        const { generateRules } = await import('../../core/rules-generator.js');
        const rulesResult = await generateRules(cwd, { languages: detection.languages });
        if (rulesResult.written.length > 0) {
          rulesSpinner.succeed(
            `Generated ${rulesResult.written.length} language rule file(s) in .claude/rules/`
          );
          for (const f of rulesResult.written) {
            console.log(chalk.gray(`  - ${path.relative(cwd, f)}`));
          }
        } else {
          rulesSpinner.info(
            'No language rule templates applicable (no supported languages detected)'
          );
        }
        if (rulesResult.preserved.length > 0) {
          console.log(
            chalk.gray(`  · ${rulesResult.preserved.length} user-authored rule file(s) preserved`)
          );
        }
      } catch (err) {
        rulesSpinner.warn(
          `Rules generation skipped: ${err instanceof Error ? err.message : String(err)}`
        );
      }

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

    if (!minimalMode) {
      const claudeIntSpinner = ora('Checking Claude Code integration...').start();
      try {
        const { setupClaudeCodeIntegration } = await import('../../core/claude-mcp.js');
        const result = await setupClaudeCodeIntegration(cwd);
        if (result.detected) {
          claudeIntSpinner.succeed('Claude Code integration configured');
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
          claudeIntSpinner.info('Claude Code not detected (skipped)');
        }
      } catch {
        claudeIntSpinner.info('Claude Code integration skipped');
      }
    }

    try {
      const { installRalphScripts } = await import('../../core/ralph-scripts.js');
      const scripts = await installRalphScripts(cwd);
      if (scripts.length > 0) {
        console.log(
          chalk.gray(`  • ${scripts.length} Ralph scripts installed to .rulebook/scripts/`)
        );
      }
    } catch {
      // Skip if Ralph scripts installation fails
    }

    try {
      const { initPlans } = await import('../../core/plans-manager.js');
      const created = await initPlans(cwd);
      if (created) {
        console.log(chalk.gray('  • PLANS.md created for session continuity'));
      }
    } catch {
      // Non-blocking
    }

    try {
      const { initOverride } = await import('../../core/override-manager.js');
      const created = await initOverride(cwd);
      if (created) {
        console.log(chalk.gray('  • AGENTS.override.md created (add project-specific rules here)'));
      }
    } catch {
      // Non-blocking
    }

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

    try {
      const fsPromises = await import('fs/promises');
      const accidentalDir = path.join(cwd, '.rulebook', '.rulebook');
      if (existsSync(accidentalDir)) {
        await fsPromises.rm(accidentalDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }

    const wsConfig = WorkspaceManager.findWorkspaceConfig(cwd);
    if (wsConfig && wsConfig.projects.length > 1) {
      console.log(
        chalk.yellow(
          `\n⚠ Workspace detected: "${wsConfig.name}" with ${wsConfig.projects.length} projects.`
        )
      );
      console.log(
        chalk.yellow('  The MCP server will auto-detect workspace mode. For explicit setup, run:')
      );
      console.log(chalk.yellow('    rulebook workspace init'));
      console.log(
        chalk.yellow(
          '  Then run `rulebook init` inside each sub-project individually for best results.\n'
        )
      );
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
