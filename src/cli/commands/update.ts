import chalk from 'chalk';
import ora from 'ora';
import { detectProject } from '../../core/detect/detector.js';
import { mergeFullAgents, mergeClaudeMd } from '../../core/merger.js';
import { writeFile } from '../../utils/file-system.js';
import { existsSync } from 'fs';
import { RulebookConfig } from '../../types.js';
import { installGitHooks } from '../../utils/git-hooks.js';
import type { LanguageDetection, ProjectConfig, ModuleDetection } from '../../types.js';
import { scaffoldMinimalProject } from '../../core/generators/minimal-scaffolder.js';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { SkillsManager, getDefaultTemplatesPath } from '../../core/skills/skills-manager.js';
import { WorkspaceManager } from '../../core/workspace/workspace-manager.js';
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
        dryRun?: boolean;
    }
): Promise<void> {
    // v7: --dry-run prints the migration plan and exits before ANY write.
    if (options.dryRun) {
        const { planV6Cleanup } = await import('../../core/migration/v6-cleanup.js');
        const plan = await planV6Cleanup(cwd);
        console.log(chalk.bold.blue('\n🔎 rulebook update --dry-run (no files were changed)\n'));
        console.log(chalk.bold('Would regenerate (lean v7):'));
        console.log(chalk.gray('  • CLAUDE.md, AGENTS.md, .rulebook/specs/* (lowercase names)'));
        console.log(
            chalk.gray('  • .claude/settings.json — strip retired hooks, apply autonomy profile')
        );
        console.log(chalk.gray('  • .mcp.json — slim rulebook-mcp entrypoint'));
        if (plan.remove.length > 0) {
            console.log(chalk.bold(`\nWould remove ${plan.remove.length} retired file(s):`));
            for (const p of plan.remove) console.log(chalk.gray(`  - ${p}`));
        }
        if (plan.rename.length > 0) {
            console.log(chalk.bold(`\nWould rename ${plan.rename.length} spec(s) to lowercase:`));
            for (const r of plan.rename) console.log(chalk.gray(`  - ${r.from} → ${r.to}`));
        }
        if (plan.preserved.length > 0) {
            console.log(chalk.bold(`\nKept (look user-authored — no rulebook marker):`));
            for (const p of plan.preserved) console.log(chalk.gray(`  · ${p}`));
        }
        console.log(chalk.gray('\nRun without --dry-run to apply.\n'));
        return;
    }

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

    const { createConfigManager } = await import('../../core/state/config-manager.js');
    const configManager = createConfigManager(cwd);
    const existingConfig = await configManager.loadConfig();

    let existingMode: 'minimal' | 'full' | undefined;
    let existingLightMode: boolean | undefined;
    if (existingConfig) {
        if (
            existingConfig &&
            (existingConfig.mode === 'minimal' || existingConfig.mode === 'full')
        ) {
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
        modules: minimalMode
            ? []
            : detection.modules.filter((m) => m.detected).map((m) => m.module),
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

    const existingSkills = existingConfig.skills?.enabled || [];

    let detectedSkills: string[] = [];
    try {
        const skillsManager = new SkillsManager(getDefaultTemplatesPath(), cwd);

        const rulebookConfigForSkills = {
            languages: config.languages as LanguageDetection['language'][],
            modules: config.modules as ModuleDetection['module'][],
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
        modules: config.modules as ModuleDetection['module'][],
        modular: config.modular ?? true,
        rulebookDir: config.rulebookDir || '.rulebook',
        skills: detectedSkills.length > 0 ? { enabled: detectedSkills } : undefined,
    });

    await configManager.ensureGitignore();

    {
        const { hasFlatLayout, migrateFlatToSpecs } = await import('../../core/migrator.js');
        const rulebookDirForMigration = config.rulebookDir || '.rulebook';
        if (await hasFlatLayout(cwd, rulebookDirForMigration)) {
            const migrationSpinner = ora(
                'Migrating rulebook files to specs/ subdirectory...'
            ).start();
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
        const { createTaskManager } = await import('../../core/tasks/task-manager.js');
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

    const claudeUpdateSpinner = ora('Updating CLAUDE.md (v7 lean format)...').start();
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
        claudeUpdateSpinner.warn(
            `CLAUDE.md update skipped: ${err instanceof Error ? err.message : String(err)}`
        );
    }

    try {
        const { ensureGitignoreEntries } = await import('../../utils/gitignore.js');
        await ensureGitignoreEntries(cwd, ['CLAUDE.local.md', '.rulebook/backup/']);
    } catch {
        // non-fatal
    }

    // Prune legacy Ralph artifacts left over from older versions. The Ralph
    // subsystem was removed; projects upgraded from older releases still carry
    // its scripts, history dir, slash commands, and cursor rule.
    try {
        const removed = await purgeLegacyRalphArtifacts(cwd);
        if (removed.length > 0) {
            console.log(chalk.gray(`  • Pruned ${removed.length} legacy Ralph artifact(s)`));
        }
    } catch {
        // non-fatal
    }

    try {
        const { generateMcpReference } = await import('../../core/docs/mcp-reference-generator.js');
        const mcpRef = await generateMcpReference(cwd);
        if (mcpRef.written) {
            console.log(chalk.gray('  • .claude/rules/mcp-tool-reference.md refreshed'));
        }
    } catch {
        // non-fatal
    }

    try {
        const { applyClaudeSettings } = await import(
            '../../core/claude/claude-settings-manager.js'
        );
        // v7: one optional path-only guard + full-autonomy permissions; every
        // retired v5/v6 hook entry is stripped on sync (LEGACY_SIGNATURES).
        const rulebookCfg = await configManager.loadConfig();
        const multiAgentEnabled = rulebookCfg?.multiAgent?.enabled ?? false;
        const settingsResult = await applyClaudeSettings(cwd, {
            taskScaffoldingGuard: true,
            fullAutonomyPermissions: true,
            teamsEnv: multiAgentEnabled,
        });
        if (settingsResult.changed) {
            console.log(
                chalk.gray(`  • .claude/settings.json refreshed (v7 lean hooks + permissions)`)
            );
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
        const { generateRules } = await import('../../core/generators/rules-generator.js');
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
                chalk.gray(
                    `  · ${rulesResult.preserved.length} user-authored rule file(s) preserved`
                )
            );
        }
    } catch (err) {
        rulesUpdateSpinner.warn(
            `Rules refresh skipped: ${err instanceof Error ? err.message : String(err)}`
        );
    }

    {
        // v7: the canonical always-on rule set is retired (F-001/F-008) — its
        // content lives as one-line values in the lean CLAUDE.md/AGENTS.md.
        // `update` no longer installs it; user-authored rules in
        // .rulebook/rules/ are still projected.
        const { projectRules } = await import('../../core/rule-engine.js');

        const ruleResult = await projectRules(cwd, {
            claudeCode:
                existsSync(path.join(cwd, '.claude')) || existsSync(path.join(cwd, 'CLAUDE.md')),
        });

        if (ruleResult.claudeCode.length > 0) {
            console.log(
                chalk.gray(`  • Projected ${ruleResult.claudeCode.length} canonical rule file(s)`)
            );
        }
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
        logging: true,
        gitHooks: gitHooksActiveAfterUpdate,
        templates: true,
        context: minimalMode ? false : true,
        health: true,
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
        ...(existingConfig.skills ? { skills: existingConfig.skills } : {}),
        ...(leanMode
            ? { agentsMode: 'lean' as const }
            : existingConfig.agentsMode
              ? { agentsMode: existingConfig.agentsMode }
              : {}),
    };

    await configManager.saveConfig(rulebookConfig);
    configSpinner.succeed('.rulebook configuration updated');

    // v6 → v7 cleanup: remove rulebook-owned retired files, normalize spec names.
    try {
        const { planV6Cleanup, applyV6Cleanup } = await import(
            '../../core/migration/v6-cleanup.js'
        );
        const plan = await planV6Cleanup(cwd);
        if (plan.remove.length > 0 || plan.rename.length > 0) {
            const { removed, renamed } = await applyV6Cleanup(cwd, plan);
            if (removed.length > 0) {
                console.log(
                    chalk.gray(`  • v7 cleanup: removed ${removed.length} retired file(s)`)
                );
            }
            if (renamed.length > 0) {
                console.log(
                    chalk.gray(`  • v7 cleanup: normalized ${renamed.length} spec name(s)`)
                );
            }
            if (plan.preserved.length > 0) {
                console.log(
                    chalk.gray(
                        `  · ${plan.preserved.length} retired-name file(s) kept (user-authored)`
                    )
                );
            }
        }
    } catch {
        // cleanup is best-effort — never block an update
    }

    const claudeSpinner = ora('Checking Claude Code integration...').start();
    try {
        const { setupClaudeCodeIntegration } = await import('../../core/claude/claude-mcp.js');
        const result = await setupClaudeCodeIntegration(cwd);
        if (result.detected) {
            claudeSpinner.succeed('Claude Code integration updated');
            if (result.mcpConfigured) {
                console.log(chalk.gray('  • MCP server added to .mcp.json'));
            }
            if (result.skillsInstalled.length > 0) {
                console.log(
                    chalk.gray(
                        `  • ${result.skillsInstalled.length} skills updated in .claude/commands/`
                    )
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
            if (result.workflowDefinitionsInstalled.length > 0) {
                console.log(
                    chalk.gray(
                        `  • ${result.workflowDefinitionsInstalled.length} workflows updated in .claude/workflows/`
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
        const { initPlans } = await import('../../core/tasks/plans-manager.js');
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
        const fsPromises = await import('fs/promises');
        const accidentalDir = path.join(cwd, '.rulebook', '.rulebook');
        if (existsSync(accidentalDir)) {
            await fsPromises.rm(accidentalDir, { recursive: true, force: true });
        }
    } catch {
        // Ignore cleanup errors
    }

    try {
        const { runDoctor } = await import('../../core/quality/doctor.js');
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
    // v7 (#19): the tail retro-append was removed — pre-existing tasks defined
    // their own scope; new tasks still get the tail scaffold from createTask().

    console.log(chalk.bold.green('\n✅ Update complete!\n'));
    console.log(chalk.white('Updated components:'));
    console.log(chalk.green('  ✓ AGENTS.md - Merged with latest templates'));
    console.log(chalk.green(`  ✓ .rulebook - Updated to v${getRulebookVersion()}`));

    // v7: npm update advisory lives in the CLI (replaces the SessionStart hook).
    {
        const { checkForUpdate } = await import('../../utils/update-check.js');
        const advisory = await checkForUpdate(cwd, getRulebookVersion());
        if (advisory) console.log(chalk.yellow(`\n⬆ ${advisory}`));
    }

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
}

export async function updateCommand(options: {
    yes?: boolean;
    minimal?: boolean;
    light?: boolean;
    lean?: boolean;
    dryRun?: boolean;
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
                '../../core/skills/skills-manager.js'
            );
            let workspaceTplContent = '';
            try {
                const tplPath = join(getTemplatesPath(), 'core', 'workspace.md');
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
                        await fsPromises.writeFile(
                            join(specsDir, 'workspace.md'),
                            rendered,
                            'utf-8'
                        );
                    }

                    updatedCount++;
                } catch (error: any) {
                    console.error(
                        chalk.red(`  ❌ Failed to update ${project.name}: ${error.message}`)
                    );
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

/**
 * Remove legacy Ralph artifacts from a project. The Ralph subsystem was
 * removed; projects upgraded from older releases may still carry its history
 * dir, scripts, slash commands, and cursor rule. Returns the list of removed
 * paths (relative to cwd). Best-effort and non-throwing per entry.
 */
export async function purgeLegacyRalphArtifacts(cwd: string): Promise<string[]> {
    const { rm } = await import('node:fs/promises');
    const { readdirSync, existsSync, statSync } = await import('node:fs');
    const removed: string[] = [];

    // .rulebook/ralph/ — entire directory (history, lock files, etc.)
    const ralphDir = path.join(cwd, '.rulebook', 'ralph');
    if (existsSync(ralphDir) && statSync(ralphDir).isDirectory()) {
        await rm(ralphDir, { recursive: true, force: true });
        removed.push('.rulebook/ralph/');
    }

    // .rulebook/scripts/ralph-*.{sh,bat}
    const scriptsDir = path.join(cwd, '.rulebook', 'scripts');
    if (existsSync(scriptsDir) && statSync(scriptsDir).isDirectory()) {
        for (const f of readdirSync(scriptsDir)) {
            if (/^ralph-.*\.(sh|bat)$/.test(f)) {
                await rm(path.join(scriptsDir, f), { force: true });
                removed.push(`.rulebook/scripts/${f}`);
            }
        }
    }

    // .claude/commands/ralph-*.md (user's slash commands)
    const cmdsDir = path.join(cwd, '.claude', 'commands');
    if (existsSync(cmdsDir) && statSync(cmdsDir).isDirectory()) {
        for (const f of readdirSync(cmdsDir)) {
            if (/^ralph-.*\.md$/.test(f)) {
                await rm(path.join(cmdsDir, f), { force: true });
                removed.push(`.claude/commands/${f}`);
            }
        }
    }

    // .cursor/rules/ralph.mdc
    const cursorRalph = path.join(cwd, '.cursor', 'rules', 'ralph.mdc');
    if (existsSync(cursorRalph)) {
        await rm(cursorRalph, { force: true });
        removed.push('.cursor/rules/ralph.mdc');
    }

    return removed;
}
