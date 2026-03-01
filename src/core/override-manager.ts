import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileExists } from '../utils/file-system.js';

const OVERRIDE_FILE = 'AGENTS.override.md';

/**
 * Get path to AGENTS.override.md in the project root.
 */
export function getOverridePath(projectRoot: string): string {
  return path.join(projectRoot, OVERRIDE_FILE);
}

/**
 * Check if AGENTS.override.md exists.
 */
export function overrideExists(projectRoot: string): boolean {
  return existsSync(getOverridePath(projectRoot));
}

/**
 * Read override content, stripping OVERRIDE:START/END markers.
 * Returns empty string if file does not exist or has no custom content.
 */
export async function readOverrideContent(projectRoot: string): Promise<string> {
  const overridePath = getOverridePath(projectRoot);
  if (!existsSync(overridePath)) return '';

  const raw = await readFile(overridePath, 'utf-8');

  // Strip marker comments — return only actual content between them
  const match = raw.match(/<!-- OVERRIDE:START -->([\s\S]*?)<!-- OVERRIDE:END -->/);
  if (!match) return raw.trim();

  const content = match[1].trim();

  // If it still contains only the template placeholder text, treat as empty
  if (
    content.includes('This file contains project-specific directives') &&
    !content.split('\n').some((line) => line.startsWith('- ') && !line.includes('**Example'))
  ) {
    return '';
  }

  return content;
}

/**
 * Create AGENTS.override.md from template if it does not already exist.
 * Returns true if file was created, false if it already existed.
 */
export async function initOverride(projectRoot: string): Promise<boolean> {
  const overridePath = getOverridePath(projectRoot);
  if (existsSync(overridePath)) return false;

  const templatePath = path.join(
    path.dirname(path.dirname(new URL(import.meta.url).pathname)),
    'templates',
    'core',
    'AGENTS_OVERRIDE.md'
  );

  let templateContent = '';
  if (await fileExists(templatePath)) {
    templateContent = await readFile(templatePath, 'utf-8');
  } else {
    templateContent = [
      '<!-- OVERRIDE:START -->',
      '# Project-Specific Overrides',
      '',
      'Add your custom rules and team conventions here.',
      'This file is never overwritten by `rulebook init` or `rulebook update`.',
      '<!-- OVERRIDE:END -->',
      '',
    ].join('\n');
  }

  await writeFile(overridePath, templateContent);
  return true;
}

/**
 * Clear AGENTS.override.md back to the empty template.
 */
export async function clearOverride(projectRoot: string): Promise<void> {
  const overridePath = getOverridePath(projectRoot);
  const emptyContent = [
    '<!-- OVERRIDE:START -->',
    '# Project-Specific Overrides',
    '',
    'Add your custom rules and team conventions here.',
    'This file is never overwritten by `rulebook init` or `rulebook update`.',
    '<!-- OVERRIDE:END -->',
    '',
  ].join('\n');
  await writeFile(overridePath, emptyContent);
}
