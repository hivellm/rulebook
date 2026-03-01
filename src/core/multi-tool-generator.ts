/**
 * Multi-Tool Config Generator
 *
 * Generates IDE/AI-tool configuration files for detected tools:
 * - GEMINI.md for Gemini CLI
 * - .continue/rules/RULEBOOK.md for Continue.dev
 * - .windsurfrules for Windsurf IDE
 * - .github/copilot-instructions.md for GitHub Copilot
 *
 * Each generator is idempotent: if the file already contains the
 * RULEBOOK marker it gets updated; if it exists without the marker
 * (user-owned file) it is skipped.
 */

import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { DetectionResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Marker used to identify rulebook-managed content in generated files. */
const RULEBOOK_MARKER = '<!-- RULEBOOK:START -->';

/** Result of multi-tool config generation. Each field is the path written, or undefined if skipped. */
export interface MultiToolGeneratorResult {
  geminiMd?: string;
  continueRules?: string;
  windsurfRules?: string;
  copilotInstructions?: string;
}

/**
 * Resolve the templates/ides/ directory relative to the compiled dist/ output.
 * Uses the same __dirname strategy as cursor-mdc-generator.ts.
 */
function getTemplatesDir(): string {
  return path.join(__dirname, '..', '..', 'templates', 'ides');
}

/**
 * Read a template file from templates/ides/.
 * Returns the template content or null if the template does not exist.
 */
async function readTemplate(templateName: string): Promise<string | null> {
  const templatePath = path.join(getTemplatesDir(), templateName);
  if (!existsSync(templatePath)) {
    return null;
  }
  return readFile(templatePath, 'utf-8');
}

/**
 * Write content to a destination file following the idempotent pattern:
 * - If the file does not exist, create it with the template content.
 * - If the file exists and contains the RULEBOOK marker, update it.
 * - If the file exists without the marker (user-owned), skip and return null.
 *
 * Returns the absolute path written, or null if skipped.
 */
async function writeIdempotent(destPath: string, content: string): Promise<string | null> {
  if (existsSync(destPath)) {
    const existing = await readFile(destPath, 'utf-8');
    if (!existing.includes(RULEBOOK_MARKER)) {
      // User-owned file — do not overwrite
      return null;
    }
  }

  // Ensure the parent directory exists
  const parentDir = path.dirname(destPath);
  if (!existsSync(parentDir)) {
    await mkdir(parentDir, { recursive: true });
  }

  await writeFile(destPath, content, 'utf-8');
  return destPath;
}

/**
 * Generate GEMINI.md in the project root for Gemini CLI.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns The path written, or null if skipped.
 */
export async function generateGeminiMd(projectRoot: string): Promise<string | null> {
  const template = await readTemplate('GEMINI_RULES.md');
  if (!template) {
    return null;
  }

  const destPath = path.join(projectRoot, 'GEMINI.md');
  return writeIdempotent(destPath, template);
}

/**
 * Generate .continue/rules/RULEBOOK.md for the Continue.dev IDE extension.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns The path written, or null if skipped.
 */
export async function generateContinueRules(projectRoot: string): Promise<string | null> {
  const template = await readTemplate('CONTINUE_RULES.md');
  if (!template) {
    return null;
  }

  const destPath = path.join(projectRoot, '.continue', 'rules', 'RULEBOOK.md');
  return writeIdempotent(destPath, template);
}

/**
 * Generate .windsurfrules in the project root for Windsurf IDE.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns The path written, or null if skipped.
 */
export async function generateWindsurfRules(projectRoot: string): Promise<string | null> {
  const template = await readTemplate('WINDSURF_RULES.md');
  if (!template) {
    return null;
  }

  const destPath = path.join(projectRoot, '.windsurfrules');
  return writeIdempotent(destPath, template);
}

/**
 * Generate .github/copilot-instructions.md for GitHub Copilot.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns The path written, or null if skipped.
 */
export async function generateCopilotInstructions(projectRoot: string): Promise<string | null> {
  const template = await readTemplate('COPILOT_INSTRUCTIONS.md');
  if (!template) {
    return null;
  }

  const destPath = path.join(projectRoot, '.github', 'copilot-instructions.md');
  return writeIdempotent(destPath, template);
}

/**
 * Generate configuration files for all detected AI tools.
 * Only generates files for tools that are actually detected in the project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param detection - The project detection result containing tool detection flags.
 * @returns An object with paths of all generated files (undefined for skipped tools).
 */
export async function generateMultiToolConfigs(
  projectRoot: string,
  detection: DetectionResult
): Promise<MultiToolGeneratorResult> {
  const result: MultiToolGeneratorResult = {};

  if (detection.geminiCli?.detected) {
    const written = await generateGeminiMd(projectRoot);
    if (written) {
      result.geminiMd = written;
    }
  }

  if (detection.continueDev?.detected) {
    const written = await generateContinueRules(projectRoot);
    if (written) {
      result.continueRules = written;
    }
  }

  if (detection.windsurf?.detected) {
    const written = await generateWindsurfRules(projectRoot);
    if (written) {
      result.windsurfRules = written;
    }
  }

  if (detection.githubCopilot?.detected) {
    const written = await generateCopilotInstructions(projectRoot);
    if (written) {
      result.copilotInstructions = written;
    }
  }

  return result;
}
