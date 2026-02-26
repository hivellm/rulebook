/**
 * Claude Code Integration Module
 *
 * Auto-detects Claude Code installation and configures:
 * - MCP server entry in .mcp.json at project root
 * - Rulebook skills as Claude Code commands in .claude/commands/
 */

import { join, dirname } from 'path';
import { homedir } from 'os';
import { readdir } from 'fs/promises';
import { fileExists, readFile, writeFile, ensureDir } from '../utils/file-system.js';

export interface ClaudeCodeSetupResult {
  detected: boolean;
  mcpConfigured: boolean;
  skillsInstalled: string[];
}

/**
 * Detect if Claude Code is installed by checking for ~/.claude directory
 */
export async function isClaudeCodeInstalled(homeDir?: string): Promise<boolean> {
  const claudeDir = join(homeDir ?? homedir(), '.claude');
  return fileExists(claudeDir);
}

/**
 * Configure .mcp.json at project root with rulebook MCP server entry.
 * If .mcp.json already exists, merges without replacing existing entries.
 */
export async function configureMcpJson(projectRoot: string): Promise<boolean> {
  const mcpJsonPath = join(projectRoot, '.mcp.json');

  let mcpConfig: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };

  if (await fileExists(mcpJsonPath)) {
    try {
      const raw = await readFile(mcpJsonPath);
      mcpConfig = JSON.parse(raw);
    } catch {
      // If JSON is invalid, start fresh
      mcpConfig = { mcpServers: {} };
    }
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers ?? {};

  // Only add rulebook entry if not already configured (preserve user customizations)
  if (mcpConfig.mcpServers.rulebook) {
    return false;
  }

  mcpConfig.mcpServers.rulebook = {
    command: 'npx',
    args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
  };

  await writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
  return true;
}

/**
 * Install rulebook skill templates as Claude Code commands.
 * Copies templates/commands/*.md to .claude/commands/ in the project.
 */
export async function installClaudeCodeSkills(
  projectRoot: string,
  templatesPath: string
): Promise<string[]> {
  const commandsSourceDir = join(templatesPath, 'commands');
  const commandsTargetDir = join(projectRoot, '.claude', 'commands');

  if (!(await fileExists(commandsSourceDir))) {
    return [];
  }

  await ensureDir(commandsTargetDir);

  const entries = await readdir(commandsSourceDir);
  const installed: string[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;

    const sourcePath = join(commandsSourceDir, entry);
    const targetPath = join(commandsTargetDir, entry);

    const content = await readFile(sourcePath);
    await writeFile(targetPath, content);
    installed.push(entry);
  }

  return installed;
}

/**
 * Get the templates path (same logic as generator.ts getTemplatesDir)
 */
function getTemplatesPath(): string {
  return join(dirname(dirname(dirname(import.meta.url.replace('file:///', '')))), 'templates');
}

/**
 * Main entry point: detect Claude Code and set up MCP + skills.
 * Non-blocking: returns silently if Claude Code is not detected.
 */
export async function setupClaudeCodeIntegration(
  projectRoot: string,
  templatesPath?: string,
  homeDir?: string
): Promise<ClaudeCodeSetupResult> {
  const detected = await isClaudeCodeInstalled(homeDir);

  if (!detected) {
    return { detected: false, mcpConfigured: false, skillsInstalled: [] };
  }

  const resolvedTemplatesPath = templatesPath ?? getTemplatesPath();

  const mcpConfigured = await configureMcpJson(projectRoot);
  const skillsInstalled = await installClaudeCodeSkills(projectRoot, resolvedTemplatesPath);

  return { detected: true, mcpConfigured, skillsInstalled };
}
