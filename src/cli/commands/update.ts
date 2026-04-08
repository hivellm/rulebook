import chalk from 'chalk';
import ora from 'ora';
import { detectProject } from '../../core/detector.js';
import { mergeFullAgents, mergeClaudeMd } from '../../core/merger.js';
import { writeFile } from '../../utils/file-system.js';
import { existsSync } from 'fs';
import { RulebookConfig } from '../../types.js';
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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { SkillsManager, getDefaultTemplatesPath } from '../../core/skills-manager.js';
import { WorkspaceManager } from '../../core/workspace/workspace-manager.js';
import { setupClaudeCodePlugin } from './misc.js';
import { migrateMemoryDirectory } from './misc.js';

function getRulebookVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packagePath = path.join(__dirname, '..', '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '0.12.1';
  }
}

/** Update a single project at the given root directory. */
export async function updateSingleProject(
  cwd: string,
  options: {
    yes?: boolean;
    minimal?: boolean;
    light?: boolean;
    lean?: boolean;
  }
): Promise<void> {
  const spinner = ora('Detecting project structure...').start();
  const detection = await detectProject(cwd);
  spinner.succeed('Project detection complete');

  if (detection.languages.length > 0) {
    console.log(chalk.green('\n✓ Detected languages:'));
    for (const lang of detection.languages) {
      console.log(`  - ${lang.language} (${(lang.confidence * 100).toFixed(0)}% confidence)`);
    }
  }

  if (!detection.existingAgents) {
    console.log(chalk.yellow('\n⚠ No AGENTS.md found. Use "rulebook init" instead.'));
    process.exit(0);
  }

  console.log(
    chalk.green(
      `\n✓ Found existing AGENTS.md with ${detection.existingAgents.blocks.length} blocks`
    )
  );

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

  const { createConfigManager } = await import('../../core/config-manager.js');
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
  // Default to lean mode unless the user explicitly stored 'full' in their config.
  const leanMode = options.lean ?? existingConfig?.agentsMode !== 'full';

  const config: ProjectConfig = {
    languages: detection.languages.map((l) => l.language),
    modules: minimalMode ? [] : detection.modules.filter((m) => m.detected).map((m) => m.module),
    frameworks: detection.frameworks.filter((f) => f.detected).map((f) => f.framework),
    ides: [],
    projectType: 'application' as const,
    coverageThreshold: 95,
    strictDocs: true,
    generateWorkflows: false,
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

  const cursorRulesPath = path.join(cwd, '.cursorrules');
  const cursorCommandsDir = path.join(cwd, '.cursor', 'commands');
  const usesCursor = existsSync(cursorRulesPath) || existsSync(cursorCommandsDir);

  if (existsSync(cursorRulesPath)) {
    console.log(
      chalk.yellow(
        '  ⚠ .cursorrules is deprecated as of Cursor v0.45. Use .cursor/rules/*.mdc instead.'
      )
    );
  }

  if (usesCursor) {
    const existingCommandsDir = path.join(cwd, '.cursor', 'commands');
    if (existsSync(existingCommandsDir)) {
      const { readdir } = await import('fs/promises');
      const existingFiles = await readdir(existingCommandsDir);
      const hasRulebookCommands = existingFiles.some((file) => file.startsWith('rulebook-task-'));

      if (!hasRulebookCommands) {
        const { generateCursorCommands } = await import('../../core/workflow-generator.js');
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
      const { generateCursorCommands } = await import('../../core/workflow-generator.js');
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

  const existingSkills = existingConfig.skills?.enabled || [];
  const existingRalph = existingConfig.ralph;

  let detectedSkills: string[] = [];
  try {
    const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);

    const rulebookConfigForSkills = {
      languages: config.languages as LanguageDetection['language'][],
      frameworks: config.frameworks as FrameworkId[],
      modules: config.modules as ModuleDetection['module'][],
      services: config.services as ServiceId[],
    };

    detectedSkills = await skillsManager.autoDetectSkills(rulebookConfigForSkills);

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

  await configManager.ensureGitignore();

  {
    const { hasFlatLayout, migrateFlatToSpecs } = await import('../../core/migrator.js');
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

  {
    const { createTaskManager } = await import('../../core/task-manager.js');
    const rulebookDirForArchive = config.rulebookDir || '.rulebook';
    const tm = createTaskManager(cwd, rulebookDirForArchive);
    const migrated = await tm.migrateArchive();
    if (migrated) {
      console.log(chalk.gray('  • Migrated task archive to .rulebook/archive/'));
    }
  }

  const mergeSpinner = ora('Updating AGENTS.md with latest templates...').start();
  config.modular = config.modular ?? true;
  const mergedContent = await mergeFullAgents(detection.existingAgents, config, cwd);
  await writeFile(agentsPath, mergedContent);
  mergeSpinner.succeed('AGENTS.md updated');

  const claudeUpdateSpinner = ora('Updating CLAUDE.md (v5.3.0 @import format)...').start();
  try {
    const claudeResult = await mergeClaudeMd(cwd);
    const label =
      claudeResult.mode === 'create'
        ? 'created'
        : claudeResult.mode === 'replace'
          ? 'updated in-place'
          : 'migrated (legacy directives moved to AGENTS.override.md)';
    claudeUpdateSpinner.succeed(`CLAUDE.md ${label}`);
    if (claudeResult.backupPath) {
      console.log(chalk.gray(`  • backup: ${path.relative(cwd, claudeResult.backupPath)}`));
    }
    if (claudeResult.mode === 'migrate' && claudeResult.overridePath) {
      console.log(
        chalk.yellow(
          `  ! Your previous CLAUDE.md directives were migrated to ${path.relative(cwd, claudeResult.overridePath)}.`
        )
      );
      console.log(
        chalk.yellow('    Claude Code still loads them at session start via @AGENTS.override.md.')
      );
      console.log(
        chalk.yellow(
          '    Review and prune AGENTS.override.md when convenient — rulebook will never overwrite it.'
        )
      );
    }
  } catch (err) {
    claudeUpdateSpinner.warn(
      `CLAUDE.md update skipped: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  try {
    const { seedCompactContext } = await import('../../core/compact-context-manager.js');
    await seedCompactContext(cwd, { languages: detection.languages });
  } catch {
    // non-fatal
  }

  try {
    const { ensureGitignoreEntries } = await import('../../utils/gitignore.js');
    await ensureGitignoreEntries(cwd, [
      'CLAUDE.local.md',
      '.rulebook/backup/',
      '.rulebook/handoff/_pending.md',
      '.rulebook/handoff/.urgent',
      '.rulebook/telemetry/',
    ]);
  } catch {
    // non-fatal
  }

  try {
    const { generateMcpReference } = await import('../../core/mcp-reference-generator.js');
    const mcpRef = await generateMcpReference(cwd);
    if (mcpRef.written) {
      console.log(chalk.gray('  • .claude/rules/mcp-tool-reference.md refreshed'));
    }
  } catch {
    // non-fatal
  }

  try {
    const { applyClaudeSettings } = await import('../../core/claude-settings-manager.js');
    const rulebookCfg = await configManager.loadConfig();
    const multiAgentEnabled = rulebookCfg?.multiAgent?.enabled ?? false;
    const handoffEnabled = rulebookCfg?.handoff?.enabled ?? true;
    const settingsResult = await applyClaudeSettings(cwd, {
      teamEnforcement: multiAgentEnabled,
      sessionHandoff: handoffEnabled,
      compactContextReinject: true,
      qualityEnforcement: true,
    });
    if (settingsResult.changed) {
      console.log(chalk.gray(`  • .claude/settings.json refreshed (hooks wired)`));
    }
  } catch (err) {
    console.log(
      chalk.gray(
        `  · .claude/settings.json refresh skipped: ${err instanceof Error ? err.message : String(err)}`
      )
    );
  }

  const rulesUpdateSpinner = ora(
    'Refreshing path-scoped .claude/rules/ for detected languages...'
  ).start();
  try {
    const { generateRules } = await import('../../core/rules-generator.js');
    const rulesResult = await generateRules(cwd, { languages: detection.languages });
    if (rulesResult.written.length > 0) {
      rulesUpdateSpinner.succeed(
        `Refreshed ${rulesResult.written.length} language rule file(s) in .claude/rules/`
      );
    } else {
      rulesUpdateSpinner.info('No language rule templates applicable');
    }
    if (rulesResult.preserved.length > 0) {
      console.log(
        chalk.gray(`  · ${rulesResult.preserved.length} user-authored rule file(s) preserved`)
      );
    }
  } catch (err) {
    rulesUpdateSpinner.warn(
      `Rules refresh skipped: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  {
    const { projectRules, installRule, loadCanonicalRules } = await import(
      '../../core/rule-engine.js'
    );
    const existingRules = await loadCanonicalRules(cwd);

    if (existingRules.length === 0) {
      const { assessComplexity } = await import('../../core/complexity-detector.js');
      const { getTemplatesDir } = await import('../../core/generator.js');
      const complexity = assessComplexity(cwd);
      const templatesDir = getTemplatesDir();

      const tier1 = [
        'no-shortcuts',
        'git-safety',
        'sequential-editing',
        'research-first',
        'follow-task-sequence',
        'incremental-implementation',
        'knowledge-base-usage',
      ];
      const tier2 = ['task-decomposition', 'incremental-tests', 'no-deferred', 'session-workflow'];

      const toInstall = [...tier1];
      if (complexity.recommendations.tier2Rules) {
        toInstall.push(...tier2);
      }

      let installed = 0;
      for (const name of toInstall) {
        const result = await installRule(cwd, name, templatesDir);
        if (result) installed++;
      }

      if (installed > 0) {
        console.log(
          chalk.gray(
            `  • Installed ${installed} v5 canonical rules (${complexity.tier} project, ${complexity.metrics.estimatedLoc.toLocaleString()} LOC)`
          )
        );
      }
    }

    const ruleResult = await projectRules(cwd, {
      claudeCode: existsSync(path.join(cwd, '.claude')) || existsSync(path.join(cwd, 'CLAUDE.md')),
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
      console.log(chalk.gray(`  • Projected ${totalProjected} canonical rules to detected tools`));
    }
  }

  if (detection.geminiCli?.detected) {
    console.log(chalk.gray('  • Gemini CLI config updated: GEMINI.md'));
  }
  if (detection.continueDev?.detected) {
    console.log(chalk.gray('  • Continue.dev rules updated in .continue/rules/'));
  }
  if (detection.windsurf?.detected) {
    console.log(chalk.gray('  • Windsurf rules updated: .windsurfrules'));
  }
  if (detection.githubCopilot?.detected) {
    console.log(chalk.gray('  • GitHub Copilot instructions updated in .github/'));
  }

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
    ...(leanMode
      ? { agentsMode: 'lean' as const }
      : existingConfig.agentsMode
        ? { agentsMode: existingConfig.agentsMode }
        : {}),
  };

  await configManager.saveConfig(rulebookConfig);
  configSpinner.succeed('.rulebook configuration updated');

  const claudeSpinner = ora('Checking Claude Code integration...').start();
  try {
    const { setupClaudeCodeIntegration } = await import('../../core/claude-mcp.js');
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

  try {
    const { installRalphScripts } = await import('../../core/ralph-scripts.js');
    const scripts = await installRalphScripts(cwd);
    if (scripts.length > 0) {
      console.log(chalk.gray(`  • ${scripts.length} Ralph scripts updated in .rulebook/scripts/`));
    }
  } catch {
    // Skip if Ralph scripts installation fails
  }

  try {
    const { initPlans } = await import('../../core/plans-manager.js');
    await initPlans(cwd);
  } catch {
    // Non-blocking
  }

  try {
    await migrateMemoryDirectory();
  } catch {
    // Silently skip if migration fails
  }

  try {
    await setupClaudeCodePlugin();
  } catch {
    // Silently skip if plugin installation fails
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

  try {
    const { runDoctor } = await import('../../core/doctor.js');
    const doctorReport = await runDoctor(cwd);
    if (doctorReport.warnCount > 0 || doctorReport.failCount > 0) {
      console.log(
        chalk.yellow(
          `\n⚠ Doctor: ${doctorReport.passCount} pass, ${doctorReport.warnCount} warn, ${doctorReport.failCount} fail`
        )
      );
      for (const check of doctorReport.checks.filter((c) => c.status !== 'pass')) {
        const icon = check.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
        console.log(`  ${icon} ${check.name}: ${check.message}`);
      }
    }
  } catch {
    // non-fatal
  }

  // F-NEW-3: scan active tasks for missing mandatory tail and offer to append
  try {
    const { checkMandatoryTail, renderMandatoryTail } = await import('../../core/task-manager.js');
    const { promises: fsP } = await import('fs');
    const tasksDir = path.join(cwd, '.rulebook', 'tasks');
    if (existsSync(tasksDir)) {
      const taskDirs = (await fsP.readdir(tasksDir, { withFileTypes: true })).filter(
        (d) => d.isDirectory() && d.name.startsWith('phase')
      );
      let appendedCount = 0;
      for (const dir of taskDirs) {
        const tasksPath = path.join(tasksDir, dir.name, 'tasks.md');
        if (!existsSync(tasksPath)) continue;
        const content = await fsP.readFile(tasksPath, 'utf-8');
        const tail = checkMandatoryTail(content);
        if (!tail.present && tail.missing.length > 0) {
          // Count existing sections to pick the right number
          const sectionMatches = content.match(/^## \d+\./gm);
          const nextSection = (sectionMatches?.length ?? 0) + 1;
          const appendix = '\n' + renderMandatoryTail(nextSection);
          await fsP.writeFile(tasksPath, content.trimEnd() + '\n' + appendix);
          appendedCount++;
        }
      }
      if (appendedCount > 0) {
        console.log(
          chalk.yellow(
            `  • Appended mandatory tail (docs+tests+verify) to ${appendedCount} task(s) missing it`
          )
        );
      }
    }
  } catch {
    // non-fatal
  }

  console.log(chalk.bold.green('\n✅ Update complete!\n'));
  console.log(chalk.white('Updated components:'));
  console.log(chalk.green('  ✓ AGENTS.md - Merged with latest templates'));
  console.log(chalk.green(`  ✓ .rulebook - Updated to v${getRulebookVersion()}`));

  console.log(chalk.white('\nWhat was updated:'));
  console.log(chalk.gray(`  - ${detection.languages.length} language templates`));
  console.log(chalk.gray(`  - ${detection.modules.filter((m) => m.detected).length} MCP modules`));
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
}

export async function updateCommand(options: {
  yes?: boolean;
  minimal?: boolean;
  light?: boolean;
  lean?: boolean;
}): Promise<void> {
  try {
    const cwd = process.cwd();

    const ws = WorkspaceManager.findWorkspaceFromCwd(cwd);
    if (ws && ws.config.projects.length > 1) {
      console.log(chalk.bold.blue('\n🔄 Rulebook Workspace Update\n'));
      console.log(
        chalk.gray(
          `Workspace "${ws.config.name}" detected — updating ${ws.config.projects.length} projects\n`
        )
      );

      const { isAbsolute, resolve, join } = await import('path');
      const fsPromises = await import('fs/promises');
      let updatedCount = 0;

      const projectListMd = ws.config.projects
        .map((p) => {
          const root = isAbsolute(p.path) ? p.path : resolve(ws.root, p.path);
          return `- **${p.name}** → \`${root}\``;
        })
        .join('\n');

      const { getDefaultTemplatesPath: getTemplatesPath } = await import(
        '../../core/skills-manager.js'
      );
      let workspaceTplContent = '';
      try {
        const tplPath = join(getTemplatesPath(), 'core', 'WORKSPACE.md');
        workspaceTplContent = await fsPromises.readFile(tplPath, 'utf-8');
      } catch {
        // Template not available — skip
      }

      for (const project of ws.config.projects) {
        const projectRoot = isAbsolute(project.path)
          ? project.path
          : resolve(ws.root, project.path);

        console.log(chalk.bold.cyan(`\n━━━ [${project.name}] ${projectRoot} ━━━\n`));
        try {
          await updateSingleProject(projectRoot, options);

          if (workspaceTplContent) {
            const specsDir = join(projectRoot, '.rulebook', 'specs');
            await fsPromises.mkdir(specsDir, { recursive: true });
            const rendered = workspaceTplContent
              .replace(
                '{{DEFAULT_PROJECT}}',
                ws.config.defaultProject ?? ws.config.projects[0]?.name ?? ''
              )
              .replace('{{WORKSPACE_PROJECTS}}', projectListMd);
            await fsPromises.writeFile(join(specsDir, 'WORKSPACE.md'), rendered, 'utf-8');
          }

          updatedCount++;
        } catch (error: any) {
          console.error(chalk.red(`  ❌ Failed to update ${project.name}: ${error.message}`));
        }
      }

      console.log(
        chalk.bold.green(
          `\n✅ Workspace update complete — ${updatedCount}/${ws.config.projects.length} projects updated\n`
        )
      );
      return;
    }

    console.log(chalk.bold.blue('\n🔄 Rulebook Update Tool\n'));
    console.log(
      chalk.gray('This will update your AGENTS.md and .rulebook to the latest version\n')
    );
    await updateSingleProject(cwd, options);
  } catch (error) {
    console.error(chalk.red('\n❌ Update failed:'), error);
    process.exit(1);
  }
}
