import path from 'path';
import { fileExists, readFile, writeFile, ensureDir } from '../utils/file-system.js';
import { GENERATED_SENTINEL } from './rules-generator.js';

/**
 * v5.3.0 F9 — MCP tool reference auto-generation.
 *
 * Walks `.mcp.json` and `.cursor/mcp.json` to discover configured MCP
 * servers and emits `.claude/rules/mcp-tool-reference.md` listing
 * the servers so the model prefers direct MCP calls over spawning
 * sub-agents for tasks an MCP tool can handle.
 */

export async function generateMcpReference(
  projectRoot: string
): Promise<{ path: string; written: boolean }> {
  const rulesDir = path.join(projectRoot, '.claude', 'rules');
  const targetPath = path.join(rulesDir, 'mcp-tool-reference.md');

  // Skip if user has adopted the file
  if (await fileExists(targetPath)) {
    const existing = await readFile(targetPath);
    if (!existing.includes(GENERATED_SENTINEL)) {
      return { path: targetPath, written: false };
    }
  }

  // Discover MCP configs
  const servers: Array<{ name: string; source: string }> = [];

  for (const configRel of ['.mcp.json', '.cursor/mcp.json', '.claude/mcp.json']) {
    const configPath = path.join(projectRoot, configRel);
    if (!(await fileExists(configPath))) continue;
    try {
      const raw = JSON.parse(await readFile(configPath));
      const mcpServers = raw.mcpServers ?? raw.servers ?? {};
      for (const name of Object.keys(mcpServers)) {
        if (!servers.some((s) => s.name === name)) {
          servers.push({ name, source: configRel });
        }
      }
    } catch {
      // Malformed JSON — skip
    }
  }

  if (servers.length === 0) {
    // No MCP servers detected — do not generate a file
    return { path: targetPath, written: false };
  }

  await ensureDir(rulesDir);

  const lines = [
    `<!-- ${GENERATED_SENTINEL} — delete this comment to prevent regeneration on \`rulebook update\` -->`,
    '',
    '# MCP tool reference',
    '',
    'This project has the following MCP servers configured. **Prefer using',
    'MCP tools directly** instead of spawning sub-agents or running shell',
    'commands when the equivalent MCP tool exists.',
    '',
    '| Server | Source |',
    '|--------|--------|',
    ...servers.map((s) => `| \`mcp__${s.name}__*\` | \`${s.source}\` |`),
    '',
    "Use `mcp__<server>__<tool>` syntax in tool calls. Check the server's",
    'tool list for available operations before falling back to shell commands.',
    '',
  ];

  await writeFile(targetPath, lines.join('\n'));
  return { path: targetPath, written: true };
}
