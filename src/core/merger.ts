import type { ExistingAgentsInfo, ProjectConfig, AgentBlock } from '../types.js';
import { generateAgentsContent, generateLanguageRules, generateModuleRules } from './generator.js';

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
  config: ProjectConfig
): Promise<string> {
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

  // Merge language rules
  for (const language of config.languages) {
    content = await mergeLanguageRules(currentExisting, language);

    // Update existing info for next merge
    currentExisting = {
      ...currentExisting,
      content,
      blocks: parseBlocks(content),
    };
  }

  // Merge module rules
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
