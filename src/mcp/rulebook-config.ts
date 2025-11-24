import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import type { RulebookConfig } from '../types.js';

export interface MCPConfig {
  configPath: string;
  projectRoot: string;
  tasksDir: string;
  archiveDir: string;
  rawConfig: RulebookConfig;
}

/**
 * Find .rulebook file by walking up the directory tree
 * Similar to how git finds .git directory
 */
export function findRulebookFile(startDir: string): string | null {
  let dir = resolve(startDir);
  const root = process.platform === 'win32' ? dir.split(/[/\\]/)[0] + '/\\' : '/';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = join(dir, '.rulebook');
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(dir);
    if (parent === dir || dir === root) {
      // Reached filesystem root
      break;
    }
    dir = parent;
  }

  return null;
}

/**
 * Load Rulebook MCP configuration from .rulebook file
 * Finds .rulebook by walking up directories, or uses RULEBOOK_CONFIG env var
 *
 * IMPORTANT: This function must complete synchronously before server.connect() is called
 * to avoid race conditions in the MCP handshake protocol.
 */
export function loadRulebookMCPConfig(): MCPConfig {
  // Allow manual override via environment variable
  const envPath = process.env.RULEBOOK_CONFIG;
  const configPath = envPath ? resolve(envPath) : findRulebookFile(process.cwd());

  if (!configPath) {
    // Write to stderr, not stdout (MCP protocol requirement)
    console.error('[rulebook-mcp] .rulebook not found. Run `rulebook mcp init` in this project.');
    process.exit(1);
  }

  const projectRoot = dirname(configPath);

  let rawConfig: RulebookConfig;
  try {
    // Synchronous file read - must complete before server.connect()
    const raw = readFileSync(configPath, 'utf8');
    rawConfig = JSON.parse(raw) as RulebookConfig;
  } catch (error) {
    // Write to stderr, not stdout (MCP protocol requirement)
    console.error(`[rulebook-mcp] Failed to parse .rulebook: ${error}`);
    process.exit(1);
  }

  // Extract MCP config with defaults
  const mcp = rawConfig.mcp ?? {};
  const tasksDir = resolve(projectRoot, mcp.tasksDir ?? 'rulebook/tasks');
  const archiveDir = resolve(projectRoot, mcp.archiveDir ?? 'rulebook/archive');

  return {
    configPath,
    projectRoot,
    tasksDir,
    archiveDir,
    rawConfig,
  };
}
