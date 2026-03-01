/**
 * Claude Code Integration Module
 *
 * Auto-detects Claude Code installation and configures:
 * - MCP server entry in .mcp.json at project root
 * - Rulebook skills as Claude Code commands in .claude/commands/
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { readdir } from 'fs/promises';
import { fileExists, readFile, writeFile, ensureDir } from '../utils/file-system.js';

export interface ClaudeCodeSetupResult {
  detected: boolean;
  mcpConfigured: boolean;
  skillsInstalled: string[];
  agentTeamsEnabled: boolean;
  agentDefinitionsInstalled: string[];
}

/**
 * Detect if Claude Code is installed by checking for ~/.claude directory
 */
export async function isClaudeCodeInstalled(homeDir?: string): Promise<boolean> {
  const claudeDir = join(homeDir ?? homedir(), '.claude');
  return fileExists(claudeDir);
}

/**
 * Build the expected MCP server args array for a given project root.
 */
function buildMcpServerArgs(projectRoot: string): string[] {
  return ['-y', '@hivehub/rulebook@latest', 'mcp-server', '--project-root', projectRoot];
}

/**
 * Configure .mcp.json at project root with rulebook MCP server entry.
 * If .mcp.json already exists, merges without replacing existing entries.
 * Includes --project-root to prevent MCP server conflicts in multi-project workspaces.
 * If the entry already exists but lacks --project-root, it is updated in place.
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

  const expectedArgs = buildMcpServerArgs(projectRoot);

  if (mcpConfig.mcpServers.rulebook) {
    const existing = mcpConfig.mcpServers.rulebook as { args?: string[] };
    const hasProjectRoot = existing.args?.includes('--project-root');

    if (!hasProjectRoot) {
      // Upgrade legacy entry to include --project-root
      existing.args = expectedArgs;
      await writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
    }

    return false; // Entry already existed
  }

  mcpConfig.mcpServers.rulebook = {
    command: 'npx',
    args: expectedArgs,
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
 * Configure .claude/settings.json to enable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS.
 * Creates the file if it does not exist. Preserves existing settings.
 * Returns true if the settings were modified, false if already configured.
 */
export async function configureClaudeSettings(projectRoot: string): Promise<boolean> {
  const settingsPath = join(projectRoot, '.claude', 'settings.json');

  let settings: Record<string, unknown> = {};

  if (await fileExists(settingsPath)) {
    try {
      const raw = await readFile(settingsPath);
      settings = JSON.parse(raw);
    } catch {
      settings = {};
    }
  }

  const env = (settings.env as Record<string, string> | undefined) ?? {};

  if (env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
    return false;
  }

  settings.env = { ...env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' };

  await ensureDir(join(projectRoot, '.claude'));
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return true;
}

/**
 * Install agent definition templates into .claude/agents/.
 * Copies templates/agents/*.md to the project's .claude/agents/ directory.
 * Creates the target directory even when no source templates exist.
 * Returns the list of installed file names.
 */
export async function installAgentDefinitions(
  projectRoot: string,
  templatesPath: string
): Promise<string[]> {
  const agentsSourceDir = join(templatesPath, 'agents');
  const agentsTargetDir = join(projectRoot, '.claude', 'agents');

  await ensureDir(agentsTargetDir);

  if (!(await fileExists(agentsSourceDir))) {
    return [];
  }

  const entries = await readdir(agentsSourceDir);
  const installed: string[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;

    const sourcePath = join(agentsSourceDir, entry);
    const targetPath = join(agentsTargetDir, entry);

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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '..', '..', 'templates');
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
    return {
      detected: false,
      mcpConfigured: false,
      skillsInstalled: [],
      agentTeamsEnabled: false,
      agentDefinitionsInstalled: [],
    };
  }

  const resolvedTemplatesPath = templatesPath ?? getTemplatesPath();

  const mcpConfigured = await configureMcpJson(projectRoot);
  const skillsInstalled = await installClaudeCodeSkills(projectRoot, resolvedTemplatesPath);
  const agentTeamsEnabled = await configureClaudeSettings(projectRoot);
  const agentDefinitionsInstalled = await installAgentDefinitions(
    projectRoot,
    resolvedTemplatesPath
  );

  return {
    detected: true,
    mcpConfigured,
    skillsInstalled,
    agentTeamsEnabled,
    agentDefinitionsInstalled,
  };
}
