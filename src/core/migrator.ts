import path from 'path';
import { writeFile, ensureDir } from '../utils/file-system.js';
import type { ExistingAgentsInfo, ProjectConfig } from '../types.js';
import {
  generateLanguageRules,
  generateModuleRules,
  generateFrameworkRules,
  generateModularAgents,
} from './generator.js';

/**
 * Detect if AGENTS.md contains embedded templates (legacy mode)
 */
export function hasEmbeddedTemplates(existing: ExistingAgentsInfo): boolean {
  if (!existing.content) return false;

  // Check for embedded language blocks (e.g., <!-- TYPESCRIPT:START -->)
  const embeddedLanguagePattern =
    /<!--\s*(TYPESCRIPT|RUST|PYTHON|JAVASCRIPT|GO|JAVA|ELIXIR|CSHARP|PHP|SWIFT|KOTLIN|CPP|C|SOLIDITY|ZIG|ERLANG|DART|RUBY|SCALA|R|HASKELL|JULIA|LUA|ADA|SAS|LISP|OBJECTIVEC|SQL):START\s*-->/i;

  // Check for embedded module blocks (e.g., <!-- OPENSPEC:START -->)
  const embeddedModulePattern =
    /<!--\s*(OPENSPEC|VECTORIZER|SYNAP|CONTEXT7|GITHUB|PLAYWRIGHT|SUPABASE|NOTION|ATLASSIAN|SERENA|FIGMA|GRAFANA|AGENT_AUTOMATION):START\s*-->/i;

  // Check for embedded framework blocks (e.g., <!-- REACT:START -->)
  const embeddedFrameworkPattern =
    /<!--\s*(NESTJS|SPRING|LARAVEL|ANGULAR|REACT|VUE|NUXT|NEXTJS|DJANGO|RAILS|FLASK|SYMFONY|ZEND|JQUERY|REACTNATIVE|FLUTTER|ELECTRON):START\s*-->/i;

  return (
    embeddedLanguagePattern.test(existing.content) ||
    embeddedModulePattern.test(existing.content) ||
    embeddedFrameworkPattern.test(existing.content)
  );
}

/**
 * Extract embedded template content and write to /rulebook/ directory
 */
export async function migrateEmbeddedTemplates(
  existing: ExistingAgentsInfo,
  config: ProjectConfig,
  projectRoot: string
): Promise<{
  extractedLanguages: string[];
  extractedModules: string[];
  extractedFrameworks: string[];
}> {
  const rulebookDir = config.rulebookDir || 'rulebook';
  const rulebookPath = path.join(projectRoot, rulebookDir);
  await ensureDir(rulebookPath);

  // Note: If files already exist, they will be overwritten
  // This is intentional for migration - existing modular files take precedence

  const extractedLanguages: string[] = [];
  const extractedModules: string[] = [];
  const extractedFrameworks: string[] = [];

  if (!existing.content) {
    return { extractedLanguages, extractedModules, extractedFrameworks };
  }

  // Extract language blocks
  for (const language of config.languages) {
    const blockName = language.toUpperCase();
    const languageBlock = existing.blocks.find((b) => b.name === blockName);

    if (languageBlock && languageBlock.content) {
      // Write extracted content to /rulebook/[LANG].md
      const filePath = path.join(rulebookPath, `${blockName}.md`);
      await writeFile(filePath, languageBlock.content);
      extractedLanguages.push(language);
    } else {
      // Generate new template if not found
      const langRules = await generateLanguageRules(language);
      const filePath = path.join(rulebookPath, `${blockName}.md`);
      await writeFile(filePath, langRules);
      extractedLanguages.push(language);
    }
  }

  // Extract module blocks
  for (const module of config.modules) {
    const blockName = module.toUpperCase();
    const moduleBlock = existing.blocks.find((b) => b.name === blockName);

    if (moduleBlock && moduleBlock.content) {
      // Write extracted content to /rulebook/[MODULE].md
      const filePath = path.join(rulebookPath, `${blockName}.md`);
      await writeFile(filePath, moduleBlock.content);
      extractedModules.push(module);
    } else {
      // Generate new template if not found
      const moduleRules = await generateModuleRules(module);
      const filePath = path.join(rulebookPath, `${blockName}.md`);
      await writeFile(filePath, moduleRules);
      extractedModules.push(module);
    }
  }

  // Extract framework blocks
  if (config.frameworks) {
    for (const framework of config.frameworks) {
      const blockName = framework.toUpperCase();
      const frameworkBlock = existing.blocks.find((b) => b.name === blockName);

      if (frameworkBlock && frameworkBlock.content) {
        // Write extracted content to /rulebook/[FRAMEWORK].md
        const filePath = path.join(rulebookPath, `${blockName}.md`);
        await writeFile(filePath, frameworkBlock.content);
        extractedFrameworks.push(framework);
      } else {
        // Generate new template if not found
        const frameworkRules = await generateFrameworkRules(framework);
        const filePath = path.join(rulebookPath, `${blockName}.md`);
        await writeFile(filePath, frameworkRules);
        extractedFrameworks.push(framework);
      }
    }
  }

  return { extractedLanguages, extractedModules, extractedFrameworks };
}

/**
 * Replace embedded templates with references in AGENTS.md
 * Uses generateModularAgents to ensure consistent format
 */
export async function replaceEmbeddedWithReferences(
  config: ProjectConfig,
  projectRoot: string
): Promise<string> {
  // Use generateModularAgents to get the proper format with references
  // This ensures consistency and handles all the reference generation
  return await generateModularAgents(config, projectRoot);
}
