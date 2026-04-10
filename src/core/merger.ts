import type { ExistingAgentsInfo, ProjectConfig, AgentBlock } from '../types.js';
import { generateAgentsContent, generateLanguageRules, generateModuleRules } from './generator.js';
import {
  hasEmbeddedTemplates,
  migrateEmbeddedTemplates,
  replaceEmbeddedWithReferences,
} from './migrator.js';
import {
  generateClaudeMd,
  getClaudeMdPath,
  hasV2Sentinels,
  writeClaudeMd,
  CLAUDE_MD_SENTINEL_END,
} from './claude-md-generator.js';
import { fileExists, readFile, writeFile } from '../utils/file-system.js';
import { getOverridePath, initOverride } from './override-manager.js';

export async function mergeAgents(
  existing: ExistingAgentsInfo,
  config: ProjectConfig
): Promise<string> {
  const lines = existing.content!.split('\n');
  const rulebookBlock = existing.blocks.find((b) => b.name === 'RULEBOOK');

  // Generate new RULEBOOK content
  const newRulebookContent = await generateAgentsContent(config);

  if (rulebookBlock) {
    // Replace existing RULEBOOK block
    const beforeBlock = lines.slice(0, rulebookBlock.startLine).join('\n');
    const afterBlock = lines.slice(rulebookBlock.endLine + 1).join('\n');
    return [beforeBlock, newRulebookContent, afterBlock].join('\n').trim() + '\n';
  } else {
    // Insert RULEBOOK at the beginning
    return [newRulebookContent, '', existing.content].join('\n').trim() + '\n';
  }
}

export async function mergeLanguageRules(
  existing: ExistingAgentsInfo,
  language: string
): Promise<string> {
  const lines = existing.content!.split('\n');
  const blockName = language.toUpperCase();
  const languageBlock = existing.blocks.find((b) => b.name === blockName);

  const newLanguageContent = await generateLanguageRules(language);

  if (languageBlock) {
    // Replace existing language block
    const beforeBlock = lines.slice(0, languageBlock.startLine).join('\n');
    const afterBlock = lines.slice(languageBlock.endLine + 1).join('\n');
    return [beforeBlock, newLanguageContent, afterBlock].join('\n').trim() + '\n';
  } else {
    // Append language block at the end
    return [existing.content, '', newLanguageContent].join('\n').trim() + '\n';
  }
}

export async function mergeModuleRules(
  existing: ExistingAgentsInfo,
  module: string
): Promise<string> {
  const lines = existing.content!.split('\n');
  const blockName = module.toUpperCase();
  const moduleBlock = existing.blocks.find((b) => b.name === blockName);

  const newModuleContent = await generateModuleRules(module);

  if (moduleBlock) {
    // Replace existing module block
    const beforeBlock = lines.slice(0, moduleBlock.startLine).join('\n');
    const afterBlock = lines.slice(moduleBlock.endLine + 1).join('\n');
    return [beforeBlock, newModuleContent, afterBlock].join('\n').trim() + '\n';
  } else {
    // Append module block at the end
    return [existing.content, '', newModuleContent].join('\n').trim() + '\n';
  }
}

export async function mergeFullAgents(
  existing: ExistingAgentsInfo,
  config: ProjectConfig,
  projectRoot?: string
): Promise<string> {
  // Always use lean template — the procedural 6k-line output is deprecated.
  if (projectRoot) {
    const { generateLeanAgents } = await import('./generator.js');
    return await generateLeanAgents(config, projectRoot);
  }

  // Check if we need to migrate from embedded to modular
  const needsMigration = hasEmbeddedTemplates(existing) && config.modular !== false;

  if (needsMigration && projectRoot) {
    // Migrate embedded templates to /rulebook/ directory
    await migrateEmbeddedTemplates(existing, config, projectRoot);

    // Generate new modular AGENTS.md with references
    // This replaces the entire content with modular format
    return await replaceEmbeddedWithReferences(config, projectRoot);
  }

  // Legacy merge behavior (for non-modular mode or when migration not needed)
  let content = existing.content!;
  let currentExisting = { ...existing };

  // Merge RULEBOOK section
  content = await mergeAgents(currentExisting, config);

  // Update existing info for next merge
  currentExisting = {
    ...currentExisting,
    content,
    blocks: parseBlocks(content),
  };

  // If modular mode, use generateModularAgents instead of merging blocks
  if (config.modular !== false && projectRoot) {
    const { generateModularAgents } = await import('./generator.js');
    return await generateModularAgents(config, projectRoot);
  }

  // Legacy: Merge language rules (embedded)
  for (const language of config.languages) {
    content = await mergeLanguageRules(currentExisting, language);

    // Update existing info for next merge
    currentExisting = {
      ...currentExisting,
      content,
      blocks: parseBlocks(content),
    };
  }

  // Legacy: Merge module rules (embedded)
  for (const module of config.modules) {
    content = await mergeModuleRules(currentExisting, module);

    // Update existing info for next merge
    currentExisting = {
      ...currentExisting,
      content,
      blocks: parseBlocks(content),
    };
  }

  return content;
}

export type MergeClaudeMdMode = 'create' | 'replace' | 'migrate';

export interface MergeClaudeMdResult {
  path: string;
  backupPath: string | null;
  mode: MergeClaudeMdMode;
  /**
   * Path of `AGENTS.override.md` if it was touched during migration.
   * Null when mode !== 'migrate'.
   */
  overridePath: string | null;
}

/**
 * Merge a generated v5.3.0 CLAUDE.md block into an existing CLAUDE.md file
 * (or create the file if absent).
 *
 * Three modes:
 * - **create**: file does not exist → write the generated block.
 * - **replace**: file already has `RULEBOOK:START v5.3.0` sentinels → in-place
 *   block replacement, preserving everything outside the sentinels verbatim.
 * - **migrate**: file exists without sentinels (legacy v5.2) → the entire
 *   legacy file is appended into `AGENTS.override.md` inside the existing
 *   `OVERRIDE:START/END` sentinels (so it survives every future
 *   `rulebook update`), and a fresh thin CLAUDE.md is written. The new
 *   CLAUDE.md imports `@AGENTS.override.md`, so Claude Code re-loads the
 *   migrated directives at session start exactly as if they were still in
 *   CLAUDE.md (per the official Anthropic memory docs, imports are
 *   "expanded and loaded into context at launch alongside the CLAUDE.md
 *   that references them").
 *
 * In all modes a `.backup-<timestamp>` snapshot of any pre-existing
 * CLAUDE.md is created before overwrite.
 */
export async function mergeClaudeMd(projectRoot: string): Promise<MergeClaudeMdResult> {
  const target = getClaudeMdPath(projectRoot);

  if (!(await fileExists(target))) {
    const generated = await generateClaudeMd(projectRoot);
    const written = await writeClaudeMd(projectRoot, generated);
    return { ...written, mode: 'create', overridePath: null };
  }

  const existing = await readFile(target);

  if (hasV2Sentinels(existing)) {
    // In-place block replacement: keep everything outside the sentinels.
    const generated = await generateClaudeMd(projectRoot);
    const blockRegex = /<!--\s*RULEBOOK:START v5\.3\.0[\s\S]*?<!--\s*RULEBOOK:END\s*-->/;
    const merged = existing.replace(blockRegex, extractGeneratedBlock(generated));
    const written = await writeClaudeMd(projectRoot, merged);
    return { ...written, mode: 'replace', overridePath: null };
  }

  // Legacy v5.2 CLAUDE.md without sentinels.
  // 1. Migrate its full content into AGENTS.override.md (which is never
  //    touched by future `rulebook update` runs).
  // 2. THEN regenerate the CLAUDE.md so `@AGENTS.override.md` resolves as a
  //    live import (otherwise the resolver would comment it out because the
  //    override file did not exist yet at template-render time).
  // 3. Claude Code re-loads the migrated directives at session start via
  //    @AGENTS.override.md (per Anthropic memory docs: "imports are expanded
  //    and loaded into context at launch alongside the CLAUDE.md that
  //    references them").
  const overridePath = await migrateLegacyClaudeMdToOverride(projectRoot, existing);
  const generated = await generateClaudeMd(projectRoot);
  const written = await writeClaudeMd(projectRoot, generated);
  return { ...written, mode: 'migrate', overridePath };
}

/**
 * Append the contents of a legacy CLAUDE.md to AGENTS.override.md inside its
 * existing `OVERRIDE:START/END` sentinels. Idempotent: if the same migration
 * marker is already present (e.g. a second update run on a project that was
 * already migrated), the legacy content is not duplicated.
 *
 * Returns the absolute path of the override file.
 */
async function migrateLegacyClaudeMdToOverride(
  projectRoot: string,
  legacyClaudeMdContent: string
): Promise<string> {
  // Ensure the override file exists (creates from template if absent).
  await initOverride(projectRoot);
  const overridePath = getOverridePath(projectRoot);
  const currentOverride = await readFile(overridePath);

  const migrationMarker = '<!-- MIGRATED-FROM-CLAUDE-MD';
  if (currentOverride.includes(migrationMarker)) {
    // Already migrated — do not duplicate.
    return overridePath;
  }

  const timestamp = new Date().toISOString();
  const migrationBlock = [
    '',
    `${migrationMarker} on ${timestamp} by rulebook v5.3.0 -->`,
    '<!-- The following directives were extracted from your previous CLAUDE.md. -->',
    '<!-- They are now imported by the new CLAUDE.md via @AGENTS.override.md, so -->',
    '<!-- Claude Code re-loads them at session start exactly as before. -->',
    '<!-- Review and prune as needed — rulebook will never touch this section. -->',
    '',
    '# CLAUDE.md (legacy v5.2 content, preserved by rulebook v5.3.0)',
    '',
    legacyClaudeMdContent.trim(),
    '',
    '<!-- END MIGRATED-FROM-CLAUDE-MD -->',
    '',
  ].join('\n');

  // Append inside the existing OVERRIDE:START/END sentinels. If the file
  // does not have the sentinels (edge case: user wrote a flat override),
  // append at the end.
  const sentinelEnd = '<!-- OVERRIDE:END -->';
  let newOverride: string;
  if (currentOverride.includes(sentinelEnd)) {
    newOverride = currentOverride.replace(sentinelEnd, `${migrationBlock}\n${sentinelEnd}`);
  } else {
    newOverride = `${currentOverride.trimEnd()}\n${migrationBlock}`;
  }

  await writeFile(overridePath, newOverride);
  return overridePath;
}

/**
 * Extract just the sentinel-bounded block from a freshly generated CLAUDE.md
 * (the template always includes the sentinels at the very top, but defensive
 * extraction makes the merger robust if the template changes).
 */
function extractGeneratedBlock(generated: string): string {
  const blockRegex = /<!--\s*RULEBOOK:START v5\.3\.0[\s\S]*?<!--\s*RULEBOOK:END\s*-->/;
  const match = generated.match(blockRegex);
  if (!match) {
    // Fall back to the whole file rather than losing content.
    return generated.trim();
  }
  return match[0];
}

// Re-export the END sentinel constant so callers needing it (e.g. tests)
// have a single source of truth.
export { CLAUDE_MD_SENTINEL_END };

// Helper function to parse blocks
function parseBlocks(content: string): AgentBlock[] {
  const blocks = [];
  const lines = content.split('\n');

  let currentBlock: { name: string; startLine: number; content: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startMatch = line.match(/<!--\s*([A-Z_]+):START\s*-->/);
    const endMatch = line.match(/<!--\s*([A-Z_]+):END\s*-->/);

    if (startMatch) {
      currentBlock = {
        name: startMatch[1],
        startLine: i,
        content: [line],
      };
    } else if (endMatch && currentBlock) {
      currentBlock.content.push(line);
      blocks.push({
        name: currentBlock.name,
        startLine: currentBlock.startLine,
        endLine: i,
        content: currentBlock.content.join('\n'),
      });
      currentBlock = null;
    } else if (currentBlock) {
      currentBlock.content.push(line);
    }
  }

  return blocks;
}
