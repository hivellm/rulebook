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
import { fileExists, readFile } from '../utils/file-system.js';

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

/**
 * Merge a generated v5.3.0 CLAUDE.md block into an existing CLAUDE.md file
 * (or create the file if absent). Content outside the
 * `<!-- RULEBOOK:START v5.3.0 ... -->` / `<!-- RULEBOOK:END -->` sentinels
 * is preserved verbatim. A `.backup-<timestamp>` snapshot is created when an
 * existing file is overwritten.
 *
 * Returns the absolute paths of the written file and (if applicable) the
 * backup snapshot.
 */
export async function mergeClaudeMd(
  projectRoot: string
): Promise<{ path: string; backupPath: string | null; mode: 'create' | 'replace' | 'wrap' }> {
  const target = getClaudeMdPath(projectRoot);
  const generated = await generateClaudeMd(projectRoot);

  if (!(await fileExists(target))) {
    const written = await writeClaudeMd(projectRoot, generated);
    return { ...written, mode: 'create' };
  }

  const existing = await readFile(target);

  if (hasV2Sentinels(existing)) {
    // In-place block replacement: keep everything outside the sentinels.
    const blockRegex = /<!--\s*RULEBOOK:START v5\.3\.0[\s\S]*?<!--\s*RULEBOOK:END\s*-->/;
    const merged = existing.replace(blockRegex, extractGeneratedBlock(generated));
    const written = await writeClaudeMd(projectRoot, merged);
    return { ...written, mode: 'replace' };
  }

  // No v5.3.0 block — wrap the existing file: prepend the generated block
  // and keep the original content underneath. The existing content is
  // preserved verbatim so any v5.2-style file survives the upgrade.
  const wrapped = `${generated.trimEnd()}\n\n${existing.trimStart()}`;
  const written = await writeClaudeMd(projectRoot, wrapped);
  return { ...written, mode: 'wrap' };
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
