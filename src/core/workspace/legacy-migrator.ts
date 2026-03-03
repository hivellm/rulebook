/**
 * Legacy MCP Config Migrator
 *
 * Finds and migrates .mcp.json files that contain absolute --project-root
 * paths. Converts them to simplified args that rely on the MCP server's
 * built-in cwd walk-up discovery (`findRulebookConfig(process.cwd())`).
 */

import { isAbsolute } from 'path';
import { fileExists, readFile, writeFile } from '../../utils/file-system.js';
import { glob } from 'glob';

export interface MigrationResult {
  migratedFiles: string[];
  skippedFiles: string[];
  errors: string[];
}

/** The simplified args that replace any legacy --project-root variant. */
const SIMPLIFIED_ARGS = ['-y', '@hivehub/rulebook@latest', 'mcp-server'];

/**
 * Find and migrate .mcp.json files that contain absolute --project-root paths.
 * Converts to simplified args without --project-root (relies on cwd walk-up).
 */
export async function migrateLegacyMcpConfigs(searchRoot: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    migratedFiles: [],
    skippedFiles: [],
    errors: [],
  };

  let files: string[];
  try {
    files = await glob('**/.mcp.json', {
      cwd: searchRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    });
  } catch (err) {
    result.errors.push(`Failed to search for .mcp.json files: ${String(err)}`);
    return result;
  }

  for (const filePath of files) {
    try {
      const hasLegacy = await hasLegacyAbsolutePaths(filePath);
      if (!hasLegacy) {
        result.skippedFiles.push(filePath);
        continue;
      }

      const migrated = await migrateMcpJson(filePath);
      if (migrated) {
        result.migratedFiles.push(filePath);
      } else {
        result.skippedFiles.push(filePath);
      }
    } catch (err) {
      result.errors.push(`${filePath}: ${String(err)}`);
    }
  }

  return result;
}

/**
 * Check if a .mcp.json file has legacy absolute --project-root args
 * in any rulebook server entry.
 */
export async function hasLegacyAbsolutePaths(mcpJsonPath: string): Promise<boolean> {
  if (!(await fileExists(mcpJsonPath))) {
    return false;
  }

  let config: { mcpServers?: Record<string, { args?: string[] }> };
  try {
    const raw = await readFile(mcpJsonPath);
    config = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!config.mcpServers) {
    return false;
  }

  for (const [key, entry] of Object.entries(config.mcpServers)) {
    if (!isRulebookEntry(key)) continue;
    if (!entry?.args) continue;

    const prIdx = entry.args.indexOf('--project-root');
    if (prIdx === -1) continue;

    const value = entry.args[prIdx + 1];
    if (value && isAbsolute(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Migrate a single .mcp.json: remove --project-root from rulebook entries.
 * Creates a .mcp.json.bak backup before modifying.
 * Returns true if the file was modified, false if no changes were needed.
 */
export async function migrateMcpJson(mcpJsonPath: string): Promise<boolean> {
  if (!(await fileExists(mcpJsonPath))) {
    return false;
  }

  let config: { mcpServers?: Record<string, { command?: string; args?: string[] }> };
  try {
    const raw = await readFile(mcpJsonPath);
    config = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!config.mcpServers) {
    return false;
  }

  let modified = false;

  for (const [key, entry] of Object.entries(config.mcpServers)) {
    if (!isRulebookEntry(key)) continue;
    if (!entry?.args) continue;

    const prIdx = entry.args.indexOf('--project-root');
    if (prIdx === -1) continue;

    const value = entry.args[prIdx + 1];
    if (value && isAbsolute(value)) {
      entry.args = SIMPLIFIED_ARGS;
      modified = true;
    }
  }

  if (!modified) {
    return false;
  }

  // Create backup before writing
  const backupPath = mcpJsonPath + '.bak';
  const originalContent = await readFile(mcpJsonPath);
  await writeFile(backupPath, originalContent);

  await writeFile(mcpJsonPath, JSON.stringify(config, null, 2) + '\n');
  return true;
}

/**
 * Returns true if the mcpServers key looks like a rulebook entry
 * (e.g. "rulebook", "rulebook-memory", "rulebook-tasks").
 */
function isRulebookEntry(key: string): boolean {
  return key === 'rulebook' || key.startsWith('rulebook-');
}
