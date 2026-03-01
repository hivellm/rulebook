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
  // Memory commands (v2.2)
  memorySearchCommand,
  memorySaveCommand,
  memoryListCommand,
  memoryStatsCommand,
  memoryVerifyCommand,
  memoryCleanupCommand,
  memoryExportCommand,
  // Ralph commands (v3.0)
  ralphInitCommand,
  ralphRunCommand,
  ralphStatusCommand,
  ralphHistoryCommand,
  ralphPauseCommand,
  ralphResumeCommand,
  // Plans commands (v4.0)
  plansShowCommand,
  plansInitCommand,
  plansClearCommand,
  continueCommand,
  // Setup commands
  setupClaudeCodePlugin,
  migrateMemoryDirectory,
} from './cli/commands.js';
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

// New advanced commands (BETA)
program
  .command('watcher')
  .description('Start modern full-screen console watcher for tasks and agent progress [BETA]')
  .action(watcherCommand);

program
  .command('agent')
  .description('Start autonomous agent for managing AI CLI workflows [BETA]')
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

// Task management commands
const taskCommand = program.command('task').description('Manage Rulebook tasks');

taskCommand
  .command('create <task-id>')
  .description('Create a new task')
  .action((taskId: string) => taskCreateCommand(taskId));

taskCommand
  .command('list')
  .description('List all tasks')
  .option('--archived', 'Include archived tasks')
  .action((options: { archived?: boolean }) => taskListCommand(options.archived || false));

taskCommand
  .command('show <task-id>')
  .description('Show task details')
  .action((taskId: string) => taskShowCommand(taskId));

taskCommand
  .command('validate <task-id>')
  .description('Validate task format')
  .action((taskId: string) => taskValidateCommand(taskId));

taskCommand
  .command('archive <task-id>')
  .description('Archive a completed task')
  .option('--skip-validation', 'Skip validation before archiving')
  .action((taskId: string, options: { skipValidation?: boolean }) =>
    taskArchiveCommand(taskId, options.skipValidation || false)
  );

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
  .option('--minimal', 'Regenerate using minimal mode (essentials only)')
  .option('--light', 'Light mode: bare minimum rules (no tests, no linting)')
  .action(updateCommand);

// MCP commands
const mcpCommand = program.command('mcp').description('Manage Rulebook MCP server');

mcpCommand
  .command('init')
  .description('Initialize MCP configuration in .rulebook and .cursor/mcp.json')
  .action(() => mcpInitCommand());

program
  .command('mcp-server')
  .description('Start Rulebook MCP server for task management via MCP protocol (stdio transport)')
  .action(() => {
    mcpServerCommand();
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

// Memory commands (v2.2)
const memoryCommand = program.command('memory').description('Manage persistent memory system');

memoryCommand
  .command('search <query>')
  .description('Search memories using hybrid BM25+vector search')
  .option('--type <type>', 'Filter by memory type')
  .option('--limit <n>', 'Max results', '20')
  .option('--mode <mode>', 'Search mode: bm25, vector, hybrid', 'hybrid')
  .action((query: string, options: { type?: string; limit?: string; mode?: string }) =>
    memorySearchCommand(query, options)
  );

memoryCommand
  .command('save <text>')
  .description('Save a memory manually')
  .option('--type <type>', 'Memory type (bugfix, feature, decision, etc.)')
  .option('--title <title>', 'Memory title')
  .option('--tags <tags>', 'Comma-separated tags')
  .action((text: string, options: { type?: string; title?: string; tags?: string }) =>
    memorySaveCommand(text, options)
  );

memoryCommand
  .command('list')
  .description('List recent memories')
  .option('--limit <n>', 'Max results', '20')
  .option('--type <type>', 'Filter by type')
  .action((options: { limit?: string; type?: string }) => memoryListCommand(options));

memoryCommand
  .command('stats')
  .description('Show memory database statistics')
  .action(() => memoryStatsCommand());

memoryCommand
  .command('verify')
  .description('Verify memory system configuration and persistence')
  .action(() => memoryVerifyCommand());

memoryCommand
  .command('cleanup')
  .description('Run memory cleanup and eviction')
  .option('--force', 'Force cleanup regardless of size')
  .action((options: { force?: boolean }) => memoryCleanupCommand(options));

memoryCommand
  .command('export')
  .description('Export memories to JSON or CSV')
  .option('--format <format>', 'Output format: json or csv', 'json')
  .option('--output <path>', 'Output file path (default: stdout)')
  .action((options: { format?: string; output?: string }) => memoryExportCommand(options));

// Ralph Autonomous Loop Commands (v3.0)
const ralphCommand = program.command('ralph').description('Ralph autonomous AI agent loop');

ralphCommand
  .command('init')
  .description('Initialize Ralph and create PRD from rulebook tasks')
  .action(() => ralphInitCommand());

ralphCommand
  .command('run')
  .description('Execute autonomous iteration loop')
  .option('--max-iterations <n>', 'Maximum iterations', '10')
  .option('--tool <tool>', 'AI CLI tool: claude, amp, gemini', 'claude')
  .action((options: { maxIterations?: string; tool?: string }) =>
    ralphRunCommand({
      maxIterations: options.maxIterations ? parseInt(options.maxIterations) : undefined,
      tool: (options.tool as 'claude' | 'amp' | 'gemini') || 'claude',
    })
  );

ralphCommand
  .command('status')
  .description('Show loop progress and current iteration')
  .action(() => ralphStatusCommand());

ralphCommand
  .command('history')
  .description('Display iteration history and learnings')
  .option('--limit <n>', 'Max iterations to show', '10')
  .action((options: { limit?: string }) =>
    ralphHistoryCommand({ limit: options.limit ? parseInt(options.limit) : undefined })
  );

ralphCommand
  .command('pause')
  .description('Gracefully pause autonomous loop')
  .action(() => ralphPauseCommand());

ralphCommand
  .command('resume')
  .description('Resume from paused state')
  .action(() => ralphResumeCommand());

// Plans commands (v4.0) — PLANS.md session scratchpad
const plansCommand = program.command('plans').description('Manage PLANS.md session scratchpad');

plansCommand
  .command('show')
  .description('Display current PLANS.md context and history')
  .action(() => plansShowCommand());

plansCommand
  .command('init')
  .description('Create PLANS.md in project root')
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

// Setup commands
program
  .command('setup:plugin')
  .description('Install Rulebook plugin in Claude Code')
  .action(() => setupClaudeCodePlugin());

program
  .command('migrate:memory')
  .description('Migrate .rulebook-memory to .rulebook/memory structure')
  .action(() => migrateMemoryDirectory());

program.parse(process.argv);
