#!/usr/bin/env node

import { Command } from 'commander';
import {
    initCommand,
    validateCommand,
    workflowsCommand,
    checkDepsCommand,
    checkCoverageCommand,
    versionCommand,
    configCommand,
    tasksCommand,
    taskCreateCommand,
    taskListCommand,
    taskShowCommand,
    taskValidateCommand,
    taskArchiveCommand,
    updateCommand,
    mcpServerCommand,
    mcpInitCommand,
    // Skills commands (v2.0)
    skillListCommand,
    skillAddCommand,
    skillRemoveCommand,
    skillShowCommand,
    skillSearchCommand,
    // Plans commands (v4.0)
    plansShowCommand,
    plansInitCommand,
    plansClearCommand,
    continueCommand,
    modeSetCommand,
    // Override commands (v4.0)
    overrideShowCommand,
    overrideEditCommand,
    overrideClearCommand,
    // Setup commands
    migrateMemoryDirectory,
    // Workspace commands (v4.2)
    workspaceInitCommand,
    workspaceAddCommand,
    workspaceRemoveCommand,
    workspaceListCommand,
    workspaceStatusCommand,
    // Context Intelligence commands (v4.4)
    decisionCreateCommand,
    decisionListCommand,
    decisionShowCommand,
    decisionSupersedeCommand,
    knowledgeAddCommand,
    knowledgeListCommand,
    knowledgeShowCommand,
    knowledgeRemoveCommand,
    learnCaptureCommand,
    learnListCommand,
    learnPromoteCommand,
    // Analysis commands (v5.3.0)
    // Doctor command (v5.3.0)
    doctorCommand,
} from './cli/commands/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get version from package.json
function getVersion(): string {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        return packageJson.version;
    } catch {
        return '0.12.1'; // Fallback version
    }
}

const program = new Command();

program
    .name('rulebook')
    .description('CLI tool to standardize AI-generated projects with templates and rules')
    .version(getVersion());

program
    .command('init')
    .description('Initialize rulebook for current project')
    .option('-y, --yes', 'Skip prompts and use detected defaults')
    .option('-q, --quick', 'Quick setup with minimal prompts (language, MCP, hooks only)')
    .option('--minimal', 'Enable essentials-only setup mode')
    .option('--light', 'Light mode: bare minimum rules (no tests, no linting)')
    .option('--lean', 'Lean mode: AGENTS.md is a lightweight index (<3KB) referencing spec files')
    .option('--package <name>', 'Initialize only a single package inside a monorepo')
    .option('--add-sequential-thinking', 'Auto-add sequential-thinking MCP to .mcp.json')
    .option(
        '--tools <tools>',
        'Comma-separated AI tools to generate for (e.g., claude-code,cursor,gemini)'
    )
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
    .command('doctor')
    .description('Run rulebook health checks (file sizes, broken imports, stale state)')
    .action(doctorCommand);

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

// Task management commands
const taskCommand = program.command('task').description('Manage Rulebook tasks');

taskCommand
    .command('create <task-id>')
    .description('Create a new task')
    .option('--project <name>', 'Target a specific workspace project')
    .action((taskId: string, options: { project?: string }) =>
        taskCreateCommand(taskId, { project: options.project })
    );

taskCommand
    .command('list')
    .description('List all tasks')
    .option('--archived', 'Include archived tasks')
    .option('--project <name>', 'Target a specific workspace project')
    .option('--all-projects', 'List tasks from all workspace projects')
    .action((options: { archived?: boolean; project?: string; allProjects?: boolean }) =>
        taskListCommand(options.archived || false, {
            project: options.project,
            allProjects: options.allProjects,
        })
    );

taskCommand
    .command('show <task-id>')
    .description('Show task details')
    .option('--project <name>', 'Target a specific workspace project')
    .action((taskId: string, options: { project?: string }) =>
        taskShowCommand(taskId, { project: options.project })
    );

taskCommand
    .command('validate <task-id>')
    .description('Validate task format')
    .option('--project <name>', 'Target a specific workspace project')
    .action((taskId: string, options: { project?: string }) =>
        taskValidateCommand(taskId, { project: options.project })
    );

taskCommand
    .command('archive <task-id>')
    .description('Archive a completed task')
    .option('--skip-validation', 'Skip validation before archiving')
    .option('--project <name>', 'Target a specific workspace project')
    .action((taskId: string, options: { skipValidation?: boolean; project?: string }) =>
        taskArchiveCommand(taskId, options.skipValidation || false, { project: options.project })
    );

taskCommand
    .command('blockers')
    .description('Show task blocker chain with cascade impact')
    .option('--project <name>', 'Target a specific workspace project')
    .action(async (_options: { project?: string }) => {
        const chalk = (await import('chalk')).default;
        const { TaskManager } = await import('./core/tasks/task-manager.js');
        const { ConfigManager } = await import('./core/state/config-manager.js');
        const cwd = process.cwd();
        const cm = new ConfigManager(cwd);
        const config = await cm.loadConfig();
        const rulebookDir = config?.rulebookDir || '.rulebook';
        const tm = new TaskManager(cwd, rulebookDir);
        const tasks = await tm.listTasks();
        const blockers: Array<{ taskId: string; blocks: string[]; cascadeImpact: number }> = [];

        for (const task of tasks) {
            const metadata = await tm.getTaskMetadata(task.id);
            if (metadata?.blocks && Array.isArray(metadata.blocks) && metadata.blocks.length > 0) {
                blockers.push({
                    taskId: task.id,
                    blocks: metadata.blocks as string[],
                    cascadeImpact:
                        (metadata.cascadeImpact as number) || (metadata.blocks as string[]).length,
                });
            }
        }

        if (blockers.length === 0) {
            console.log(
                chalk.gray(
                    'No blocker chains found. Add "blocks" field to task .metadata.json to track dependencies.'
                )
            );
            return;
        }

        blockers.sort((a, b) => b.cascadeImpact - a.cascadeImpact);
        console.log(chalk.bold('\nBlocker Chain (highest cascade impact first)\n'));
        for (const b of blockers) {
            const impact =
                b.cascadeImpact >= 3
                    ? chalk.red('HIGH')
                    : b.cascadeImpact >= 2
                      ? chalk.yellow('MEDIUM')
                      : chalk.gray('LOW');
            console.log(
                `  ${chalk.green(b.taskId)} → blocks: ${b.blocks.join(', ')} (${b.cascadeImpact} tasks, ${impact} impact)`
            );
        }
        console.log('');
    });

taskCommand
    .command('blocked-by <task-id>')
    .description('Show what blocks a specific task')
    .action(async (taskId: string) => {
        const chalk = (await import('chalk')).default;
        const { TaskManager } = await import('./core/tasks/task-manager.js');
        const { ConfigManager } = await import('./core/state/config-manager.js');
        const cwd = process.cwd();
        const cm = new ConfigManager(cwd);
        const config = await cm.loadConfig();
        const rulebookDir = config?.rulebookDir || '.rulebook';
        const tm = new TaskManager(cwd, rulebookDir);
        const metadata = await tm.getTaskMetadata(taskId);
        if (!metadata) {
            console.log(chalk.yellow(`Task "${taskId}" not found or has no metadata.`));
            return;
        }
        const blockedBy = Array.isArray(metadata.blockedBy) ? (metadata.blockedBy as string[]) : [];
        if (blockedBy.length === 0) {
            console.log(chalk.green(`Task "${taskId}" is not blocked by anything.`));
        } else {
            console.log(chalk.bold(`\nTask "${taskId}" is blocked by:\n`));
            for (const b of blockedBy) {
                console.log(`  ${chalk.red('→')} ${b}`);
            }
            console.log('');
        }
    });

// Legacy tasks command (deprecated)
program
    .command('tasks')
    .description('Manage tasks (DEPRECATED - use "task" commands)')
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

program
    .command('update')
    .description('Update AGENTS.md and .rulebook to latest version')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--dry-run', 'Print the v6->v7 migration plan without changing any file')
    .option('--minimal', 'Regenerate using minimal mode (essentials only)')
    .option('--light', 'Light mode: bare minimum rules (no tests, no linting)')
    .option('--lean', 'Lean mode: AGENTS.md is a lightweight index (<3KB) referencing spec files')
    .option(
        '--tools <tools>',
        'Comma-separated AI tools to generate for (e.g., claude-code,cursor,gemini)'
    )
    .action(updateCommand);

// MCP commands
const mcpCommand = program.command('mcp').description('Manage Rulebook MCP server');

mcpCommand
    .command('init')
    .description('Initialize MCP configuration in .rulebook and .cursor/mcp.json')
    .option('--workspace', 'Configure MCP for workspace mode (multi-project)')
    .action((options: { workspace?: boolean }) => mcpInitCommand(options));

program
    .command('mcp-server')
    .description('Start Rulebook MCP server for task management via MCP protocol (stdio transport)')
    .option('--workspace', 'Run in workspace mode (multi-project)')
    .action(() => {
        mcpServerCommand();
    });

// Claude Code setup command
const claudeCommand = program
    .command('claude')
    .description('Apply the recommended Claude Code setup (MCP, agents, workflows, settings)');

claudeCommand
    .command('setup', { isDefault: true })
    .description('Install integrations and apply opinionated, cost-aware settings')
    .option('--model <model>', 'Default model for settings.json (default: sonnet)')
    .action(async (opts: { model?: string }) => {
        const { claudeSetupCommand } = await import('./cli/commands/claude.js');
        await claudeSetupCommand({ model: opts.model });
    });

// Skills commands (v2.0)
const skillCommand = program.command('skill').description('Manage Rulebook skills (v2.0)');

skillCommand
    .command('list')
    .description('List all available skills')
    .option('-c, --category <category>', 'Filter by category')
    .option('-e, --enabled', 'Show only enabled skills')
    .action((options: { category?: string; enabled?: boolean }) =>
        skillListCommand({ category: options.category, enabled: options.enabled })
    );

skillCommand
    .command('add <skill-id>')
    .description('Add (enable) a skill')
    .action((skillId: string) => skillAddCommand(skillId));

skillCommand
    .command('remove <skill-id>')
    .description('Remove (disable) a skill')
    .action((skillId: string) => skillRemoveCommand(skillId));

skillCommand
    .command('show <skill-id>')
    .description('Show skill details')
    .action((skillId: string) => skillShowCommand(skillId));

skillCommand
    .command('search <query>')
    .description('Search for skills by name, description, or tags')
    .action((query: string) => skillSearchCommand(query));

// Plans commands (v4.0) — PLANS.md session scratchpad
const plansCommand = program.command('plans').description('Manage PLANS.md session scratchpad');

plansCommand
    .command('show')
    .description('Display current PLANS.md context and history')
    .action(() => plansShowCommand());

plansCommand
    .command('init')
    .description('Create PLANS.md in .rulebook/')
    .action(() => plansInitCommand());

plansCommand
    .command('clear')
    .description('Reset PLANS.md to empty template')
    .action(() => plansClearCommand());

// Continue command — generate session continuity context
program
    .command('continue')
    .description('Generate session continuity context for a new AI session')
    .action(() => continueCommand());

// Mode command — set AGENTS.md generation mode
const modeCommand = program.command('mode').description('Configure AGENTS.md generation mode');
modeCommand
    .command('set <mode>')
    .description('Set AGENTS.md mode: lean (lightweight index) or full (all rules inline)')
    .action((mode: string) => {
        if (mode !== 'lean' && mode !== 'full') {
            console.error(`Invalid mode "${mode}". Use "lean" or "full".`);
            process.exit(1);
        }
        modeSetCommand(mode as 'lean' | 'full');
    });

// Override commands (v4.0) — AGENTS.override.md management
const overrideCommand = program
    .command('override')
    .description('Manage AGENTS.override.md — project-specific rules that survive updates');

overrideCommand
    .command('show')
    .description('Display current override content')
    .action(() => overrideShowCommand());

overrideCommand
    .command('edit')
    .description('Open AGENTS.override.md in $EDITOR (or print path)')
    .action(() => overrideEditCommand());

overrideCommand
    .command('clear')
    .description('Reset AGENTS.override.md to empty template')
    .action(() => overrideClearCommand());

program
    .command('migrate:memory')
    .description('Migrate .rulebook-memory to .rulebook/memory structure')
    .action(() => migrateMemoryDirectory());

// Workspace commands (v4.2)
const workspaceCommand = program.command('workspace').description('Manage multi-project workspace');

workspaceCommand
    .command('init')
    .description('Initialize workspace config (auto-detects monorepo, .code-workspace, etc.)')
    .action(() => workspaceInitCommand());

workspaceCommand
    .command('add <path>')
    .description('Add a project to the workspace')
    .action((projectPath: string) => workspaceAddCommand(projectPath));

workspaceCommand
    .command('remove <name>')
    .description('Remove a project from the workspace')
    .action((name: string) => workspaceRemoveCommand(name));

workspaceCommand
    .command('list')
    .description('List all projects in the workspace')
    .action(() => workspaceListCommand());

workspaceCommand
    .command('status')
    .description('Show detailed workspace status (workers, tasks, memory)')
    .action(() => workspaceStatusCommand());

// Context Intelligence commands (v4.4)
const decisionCommand = program
    .command('decision')
    .description('Manage Architecture Decision Records');

decisionCommand
    .command('create <title>')
    .description('Create a new decision record')
    .option('--context <context>', 'Decision context')
    .option('--related-task <taskId>', 'Related task ID')
    .action((title: string, options: { context?: string; relatedTask?: string }) =>
        decisionCreateCommand(title, options)
    );

decisionCommand
    .command('list')
    .description('List all decisions')
    .option('--status <status>', 'Filter by status: proposed, accepted, superseded, deprecated')
    .action((options: { status?: string }) => decisionListCommand(options));

decisionCommand
    .command('show <id>')
    .description('Show decision details')
    .action((id: string) => decisionShowCommand(id));

decisionCommand
    .command('supersede <oldId> <newId>')
    .description('Mark a decision as superseded by another')
    .action((oldId: string, newId: string) => decisionSupersedeCommand(oldId, newId));

const knowledgeCommand = program.command('knowledge').description('Manage project knowledge base');

knowledgeCommand
    .command('add <type> <title>')
    .description('Add a pattern or anti-pattern')
    .option(
        '--category <category>',
        'Category: architecture, code, testing, security, performance, devops',
        'code'
    )
    .option('--description <desc>', 'Description of the pattern')
    .action((type: string, title: string, options: { category?: string; description?: string }) =>
        knowledgeAddCommand(type, title, options)
    );

knowledgeCommand
    .command('list')
    .description('List knowledge entries')
    .option('--type <type>', 'Filter by type: pattern, anti-pattern')
    .option('--category <category>', 'Filter by category')
    .action((options: { type?: string; category?: string }) => knowledgeListCommand(options));

knowledgeCommand
    .command('show <id>')
    .description('Show knowledge entry details')
    .action((id: string) => knowledgeShowCommand(id));

knowledgeCommand
    .command('remove <id>')
    .description('Remove a knowledge entry')
    .action((id: string) => knowledgeRemoveCommand(id));

const learnCommand = program.command('learn').description('Capture and promote learnings');

learnCommand
    .command('capture')
    .description('Capture a learning')
    .option('--title <title>', 'Learning title')
    .option('--content <content>', 'Learning content')
    .option('--related-task <taskId>', 'Related task ID')
    .option('--tags <tags>', 'Comma-separated tags')
    .action((options: { title?: string; content?: string; relatedTask?: string; tags?: string }) =>
        learnCaptureCommand(options)
    );

learnCommand
    .command('list')
    .description('List learnings')
    .option('--limit <n>', 'Max results', '20')
    .action((options: { limit?: string }) => learnListCommand(options));

learnCommand
    .command('promote <id> <target>')
    .description('Promote learning to knowledge entry or decision')
    .option('--title <title>', 'Override title for the promoted entry')
    .action((id: string, target: string, options: { title?: string }) =>
        learnPromoteCommand(id, target, options)
    );

// ── Project Assessment (v5.0) ───────────────────────────────────────────

// ── Rules Management (v5.0) ─────────────────────────────────────────────

const rulesCommand = program
    .command('rules')
    .description('Manage canonical rules (.rulebook/rules/)');

rulesCommand
    .command('list')
    .description('List all canonical rules by tier')
    .action(async () => {
        const { listRules } = await import('./core/rule-engine.js');
        const chalk = (await import('chalk')).default;
        const rules = await listRules(process.cwd());
        if (rules.length === 0) {
            console.log(chalk.yellow('No canonical rules found in .rulebook/rules/'));
            console.log(
                chalk.gray('Run "rulebook rules add <name>" to install from template library')
            );
            return;
        }
        const tierLabels: Record<number, string> = {
            1: 'Tier 1 (Prohibition)',
            2: 'Tier 2 (Workflow)',
            3: 'Tier 3 (Standard)',
        };
        for (const tier of [1, 2, 3]) {
            const tierRules = rules.filter((r) => r.tier === tier);
            if (tierRules.length === 0) continue;
            console.log(chalk.bold(`\n${tierLabels[tier]}`));
            for (const r of tierRules) {
                const tools = r.tools.includes('all' as never) ? 'all tools' : r.tools.join(', ');
                console.log(`  ${chalk.green(r.name)} — ${r.description} [${chalk.gray(tools)}]`);
            }
        }
        console.log('');
    });

rulesCommand
    .command('add <name>')
    .description('Install a rule from the template library')
    .action(async (name: string) => {
        const { installRule } = await import('./core/rule-engine.js');
        const { getTemplatesDir } = await import('./core/generators/generator.js');
        const chalk = (await import('chalk')).default;
        const templatesDir = getTemplatesDir();
        const result = await installRule(process.cwd(), name, templatesDir);
        if (result) {
            console.log(chalk.green(`✓ Rule "${name}" installed to .rulebook/rules/${name}.md`));
            console.log(chalk.gray('Run "rulebook update" to project rules to all detected tools'));
        } else {
            console.log(chalk.red(`✗ Rule template "${name}" not found`));
            console.log(
                chalk.gray(
                    'Available: no-shortcuts, git-safety, sequential-editing, task-decomposition, research-first, incremental-tests, incremental-implementation, no-deferred, follow-task-sequence, session-workflow'
                )
            );
        }
    });

rulesCommand
    .command('project')
    .description('Project canonical rules to all detected tool formats')
    .action(async () => {
        const { projectRules } = await import('./core/rule-engine.js');
        const { existsSync } = await import('fs');
        const { join } = await import('path');
        const ora = (await import('ora')).default;
        const cwd = process.cwd();
        const spinner = ora('Projecting rules to Claude Code...').start();
        const result = await projectRules(cwd, {
            claudeCode: existsSync(join(cwd, '.claude')) || existsSync(join(cwd, 'CLAUDE.md')),
        });
        spinner.succeed(`Projected ${result.claudeCode.length} rule file(s)`);
    });

program.parse(process.argv);
