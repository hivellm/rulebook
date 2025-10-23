import type { ExistingAgentsInfo, ProjectConfig } from '../types.js';
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

  // Merge RULEBOOK section
  const rulebookMerged = await mergeAgents(
    { ...existing, content },
    config
  );
  content = rulebookMerged;

  // Merge language rules
  for (const language of config.languages) {
    const langMerged = await mergeLanguageRules(
      { ...existing, content },
      language
    );
    content = langMerged;
  }

  // Merge module rules
  for (const module of config.modules) {
    const moduleMerged = await mergeModuleRules(
      { ...existing, content },
      module
    );
    content = moduleMerged;
  }

  return content;
}

