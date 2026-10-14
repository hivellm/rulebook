import chalk from 'chalk';
import { WorkspaceManager } from '../../core/workspace/workspace-manager.js';
import type { ClaudeRunner } from '../../core/claude/mcp-fast-path.js';

/**
 * Initialize MCP configuration in .rulebook file
 * Adds mcp block to .rulebook and creates/updates .cursor/mcp.json
 */
export async function mcpInitCommand(options?: {
    workspace?: boolean;
    fast?: boolean;
}): Promise<void> {
    if (options?.fast) {
        process.exitCode = await mcpFastInitCommand({ workspace: options.workspace });
        return;
    }
    const { findRulebookConfig } = await import('../../mcp/rulebook-server.js');
    const { existsSync, readFileSync, writeFileSync, statSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { createConfigManager } = await import('../../core/state/config-manager.js');
    // One writer for every rulebook MCP entry (pinned version, never @latest).
    const { configureMcpJson } = await import('../../core/claude/claude-mcp.js');

    try {
        const cwd = process.cwd();

        if (options?.workspace) {
            const wsConfig = WorkspaceManager.findWorkspaceConfig(cwd);
            if (!wsConfig) {
                console.error(
                    chalk.red('No workspace found. Run `rulebook workspace init` first.')
                );
                process.exit(1);
            }

            const cursorDir = join(cwd, '.cursor');
            if (existsSync(cursorDir)) {
                await configureMcpJson(cwd, true, join(cursorDir, 'mcp.json'));
                console.log(chalk.green('✓ Workspace MCP initialized'));
                console.log(chalk.gray(`  • Updated .cursor/mcp.json with --workspace flag`));
            }

            await configureMcpJson(cwd, true);

            console.log(chalk.green('✓ Workspace MCP initialized'));
            console.log(
                chalk.gray(`  • Workspace: ${wsConfig.name} (${wsConfig.projects.length} projects)`)
            );
            console.log(chalk.gray(`  • Updated .mcp.json with --workspace flag`));
            console.log(chalk.gray(`  • MCP server will manage all projects automatically`));
            return;
        }

        let rulebookPath = findRulebookConfig(cwd);

        if (!rulebookPath) {
            rulebookPath = join(cwd, '.rulebook');
            const configManager = createConfigManager(cwd);
            await configManager.initializeConfig();
        }

        const projectRoot = dirname(rulebookPath);

        let configFilePath = rulebookPath;
        if (existsSync(rulebookPath)) {
            const stats = statSync(rulebookPath);
            if (stats.isDirectory()) {
                configFilePath = join(rulebookPath, 'rulebook.json');
            }
        }

        let config: any = {};
        if (existsSync(configFilePath)) {
            const raw = readFileSync(configFilePath, 'utf8');
            config = JSON.parse(raw);
        }

        config.mcp = config.mcp ?? {};
        if (config.mcp.enabled === undefined) config.mcp.enabled = true;
        if (!config.mcp.tasksDir) config.mcp.tasksDir = '.rulebook/tasks';
        if (!config.mcp.archiveDir) config.mcp.archiveDir = '.rulebook/archive';

        writeFileSync(configFilePath, JSON.stringify(config, null, 2) + '\n');

        const cursorDir = join(projectRoot, '.cursor');
        if (existsSync(cursorDir)) {
            await configureMcpJson(projectRoot, false, join(cursorDir, 'mcp.json'));
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

/**
 * `rulebook mcp init --fast`: register `node <absolute path to the installed
 * server>` in Claude Code's local scope (this machine and project only; the
 * checked-in .mcp.json keeps the pinned npx entry) and print the Codex
 * equivalent. Returns the process exit code.
 */
export async function mcpFastInitCommand(
    options: { workspace?: boolean } = {},
    runner?: ClaudeRunner
): Promise<number> {
    const { existsSync } = await import('fs');
    const { sep } = await import('path');
    const { buildFastMcpEntry, codexTomlSnippet, getInstalledServerPath, registerLocalMcpEntry } =
        await import('../../core/claude/mcp-fast-path.js');

    const serverPath = getInstalledServerPath();
    if (!existsSync(serverPath)) {
        console.error(chalk.red(`MCP server not found at ${serverPath}.`));
        console.error(
            chalk.gray('  Reinstall @hivehub/rulebook, or run `npm run build` in a checkout.')
        );
        return 1;
    }

    const entry = buildFastMcpEntry(serverPath, options.workspace);
    const result = await registerLocalMcpEntry(process.cwd(), entry, runner);
    if (result.registered) {
        console.log(chalk.green('✓ MCP fast path registered in Claude Code local scope'));
        console.log(chalk.gray(`  • ${entry.command} ${entry.args.join(' ')}`));
        console.log(
            chalk.gray(
                '  • This machine and project only; overrides the rulebook entry in .mcp.json'
            )
        );
        console.log(chalk.gray('  • Undo: claude mcp remove --scope local rulebook'));
    } else {
        console.log(
            chalk.yellow(
                `Claude CLI not available or failed${result.error ? ` (${result.error})` : ''}.`
            )
        );
        console.log('Register the fast path by hand:');
        console.log(`  ${result.manualCommand}`);
    }
    if (serverPath.includes(`${sep}_npx${sep}`)) {
        console.log(
            chalk.yellow(
                '  ! This path is in npx’s cache, which npm may clear. For a stable path: npm i -g @hivehub/rulebook'
            )
        );
    }

    console.log('\nCodex: add to ~/.codex/config.toml (rulebook does not edit it):');
    console.log(codexTomlSnippet(entry));
    return 0;
}

export async function mcpServerCommand(): Promise<void> {
    try {
        const { startRulebookMcpServer } = await import('../../mcp/rulebook-server.js');

        if (process.env.RULEBOOK_MCP_DEBUG === '1') {
            console.error(chalk.gray('[rulebook-mcp] Starting MCP server with stdio transport'));
            console.error(chalk.gray('[rulebook-mcp] Server will find .rulebook automatically'));
        }

        await startRulebookMcpServer();
    } catch (error: any) {
        console.error(chalk.red(`\n❌ Failed to start MCP server: ${error.message}`));
        console.error(error.stack);
        process.exit(1);
    }
}
