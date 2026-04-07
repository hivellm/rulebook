import chalk from 'chalk';
import { WorkspaceManager } from '../../core/workspace/workspace-manager.js';

/**
 * Initialize MCP configuration in .rulebook file
 * Adds mcp block to .rulebook and creates/updates .cursor/mcp.json
 */
export async function mcpInitCommand(options?: { workspace?: boolean }): Promise<void> {
  const { findRulebookConfig } = await import('../../mcp/rulebook-server.js');
  const { existsSync, readFileSync, writeFileSync, statSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { createConfigManager } = await import('../../core/config-manager.js');

  try {
    const cwd = process.cwd();

    if (options?.workspace) {
      const wsConfig = WorkspaceManager.findWorkspaceConfig(cwd);
      if (!wsConfig) {
        console.error(chalk.red('No workspace found. Run `rulebook workspace init` first.'));
        process.exit(1);
      }

      const mcpArgs = ['-y', '@hivehub/rulebook@latest', 'mcp-server', '--workspace'];
      const mcpEntry = { command: 'npx', args: mcpArgs };

      const cursorDir = join(cwd, '.cursor');
      if (existsSync(cursorDir)) {
        const mcpJsonPath = join(cursorDir, 'mcp.json');
        let mcpConfig: any = { mcpServers: {} };
        if (existsSync(mcpJsonPath)) {
          mcpConfig = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
        }
        mcpConfig.mcpServers = mcpConfig.mcpServers ?? {};
        mcpConfig.mcpServers.rulebook = mcpEntry;
        writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
        console.log(chalk.green('✓ Workspace MCP initialized'));
        console.log(chalk.gray(`  • Updated .cursor/mcp.json with --workspace flag`));
      }

      const mcpJsonPath = join(cwd, '.mcp.json');
      let mcpConfig: any = { mcpServers: {} };
      if (existsSync(mcpJsonPath)) {
        mcpConfig = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
      }
      mcpConfig.mcpServers = mcpConfig.mcpServers ?? {};
      mcpConfig.mcpServers.rulebook = mcpEntry;
      writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');

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
