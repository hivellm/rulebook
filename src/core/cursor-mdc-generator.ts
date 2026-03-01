/**
 * Cursor MDC Rules Generator
 *
 * Generates .cursor/rules/*.mdc files for Cursor IDE v0.45+.
 * The new .mdc format replaces the deprecated .cursorrules file and supports:
 * - YAML frontmatter (description, globs, alwaysApply)
 * - Multiple scoped rule files
 * - On-demand loading based on file globs
 */

import path from 'path';
import { existsSync } from 'fs';
import { readFile as fsReadFile, writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Language → .mdc template name
const LANGUAGE_MDC_MAP: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'typescript', // share the TS template for JS projects
  python: 'python',
  rust: 'rust',
  go: 'go',
};

export interface CursorMdcOptions {
  languages: string[];
  ralphEnabled: boolean;
  rulebookDir?: string;
}

export interface CursorMdcResult {
  generated: string[];
  skipped: string[];
}

/**
 * Check if Cursor IDE is being used in the project.
 * Detects: .cursor/ directory, .cursorrules, .cursor/mcp.json
 */
export function isCursorInstalled(projectRoot: string): boolean {
  return (
    existsSync(path.join(projectRoot, '.cursor')) ||
    existsSync(path.join(projectRoot, '.cursorrules'))
  );
}

/**
 * Generate .cursor/rules/*.mdc files for the project.
 * Always generates: rulebook.mdc, quality.mdc
 * Conditionally generates: ralph.mdc (if Ralph enabled), <language>.mdc
 */
export async function generateCursorMdcRules(
  projectRoot: string,
  options: CursorMdcOptions
): Promise<CursorMdcResult> {
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  await mkdir(rulesDir, { recursive: true });

  const result: CursorMdcResult = { generated: [], skipped: [] };
  const templatesDir = getTemplatesDir();

  // Always-generate files: rulebook.mdc, quality.mdc
  const alwaysFiles = ['rulebook', 'quality'];
  for (const name of alwaysFiles) {
    const wrote = await writeMdcFile(rulesDir, name, templatesDir);
    if (wrote) {
      result.generated.push(`${name}.mdc`);
    } else {
      result.skipped.push(`${name}.mdc`);
    }
  }

  // Ralph directives (only if ralph is enabled in config)
  if (options.ralphEnabled) {
    const wrote = await writeMdcFile(rulesDir, 'ralph', templatesDir);
    if (wrote) {
      result.generated.push('ralph.mdc');
    } else {
      result.skipped.push('ralph.mdc');
    }
  }

  // Language-specific files
  const writtenLangTemplates = new Set<string>();
  for (const lang of options.languages) {
    const templateName = LANGUAGE_MDC_MAP[lang.toLowerCase()];
    if (!templateName || writtenLangTemplates.has(templateName)) continue;
    writtenLangTemplates.add(templateName);

    const wrote = await writeMdcFile(rulesDir, templateName, templatesDir);
    if (wrote) {
      result.generated.push(`${templateName}.mdc`);
    } else {
      result.skipped.push(`${templateName}.mdc`);
    }
  }

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTemplatesDir(): string {
  return path.join(__dirname, '..', '..', 'templates', 'ides', 'cursor-mdc');
}

/**
 * Write a single .mdc file from template. Returns true if file was written.
 */
async function writeMdcFile(
  rulesDir: string,
  name: string,
  templatesDir: string
): Promise<boolean> {
  const templatePath = path.join(templatesDir, `${name}.mdc`);
  if (!existsSync(templatePath)) {
    return false;
  }

  const content = await fsReadFile(templatePath, 'utf-8');
  const destPath = path.join(rulesDir, `${name}.mdc`);
  await writeFile(destPath, content, 'utf-8');
  return true;
}
