import path from 'path';
import { writeFile, ensureDir, fileExists, readFile } from '../utils/file-system.js';
import type { ExistingAgentsInfo, ProjectConfig } from '../types.js';
import {
  generateLanguageRules,
  generateModuleRules,
  generateFrameworkRules,
  generateModularAgents,
} from './generator.js';
import fs from 'fs/promises';

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
    /<!--\s*(VECTORIZER|SYNAP|CONTEXT7|GITHUB|PLAYWRIGHT|SUPABASE|NOTION|ATLASSIAN|SERENA|FIGMA|GRAFANA|AGENT_AUTOMATION):START\s*-->/i;

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
  const specsPath = path.join(projectRoot, rulebookDir, 'specs');
  await ensureDir(specsPath);

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
      const filePath = path.join(specsPath, `${blockName}.md`);
      await writeFile(filePath, languageBlock.content);
      extractedLanguages.push(language);
    } else {
      // Generate new template if not found
      const langRules = await generateLanguageRules(language);
      const filePath = path.join(specsPath, `${blockName}.md`);
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
      const filePath = path.join(specsPath, `${blockName}.md`);
      await writeFile(filePath, moduleBlock.content);
      extractedModules.push(module);
    } else {
      // Generate new template if not found
      const moduleRules = await generateModuleRules(module);
      const filePath = path.join(specsPath, `${blockName}.md`);
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
        const filePath = path.join(specsPath, `${blockName}.md`);
        await writeFile(filePath, frameworkBlock.content);
        extractedFrameworks.push(framework);
      } else {
        // Generate new template if not found
        const frameworkRules = await generateFrameworkRules(framework);
        const filePath = path.join(specsPath, `${blockName}.md`);
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

/**
 * Detect if the rulebook directory uses the old flat layout
 * (markdown files directly in /rulebook/ instead of /rulebook/specs/)
 */
export async function hasFlatLayout(
  projectRoot: string,
  rulebookDir: string = 'rulebook'
): Promise<boolean> {
  const rulebookPath = path.join(projectRoot, rulebookDir);

  // Check for known spec files directly in /rulebook/ root
  const knownFiles = [
    'RULEBOOK.md',
    'QUALITY_ENFORCEMENT.md',
    'GIT.md',
    'AGENT_AUTOMATION.md',
    'TYPESCRIPT.md',
  ];

  for (const file of knownFiles) {
    if (await fileExists(path.join(rulebookPath, file))) {
      // Verify that /rulebook/specs/ doesn't already have this file
      const specsFile = path.join(rulebookPath, 'specs', file);
      if (!(await fileExists(specsFile))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Migrate flat layout to specs/ subdirectory
 * Moves .md files from /rulebook/ root to /rulebook/specs/
 * Preserves tasks/ directory and other non-.md content
 */
export async function migrateFlatToSpecs(
  projectRoot: string,
  rulebookDir: string = 'rulebook'
): Promise<{ migratedFiles: string[] }> {
  const rulebookPath = path.join(projectRoot, rulebookDir);
  const specsPath = path.join(rulebookPath, 'specs');
  await ensureDir(specsPath);

  const migratedFiles: string[] = [];

  // Read all entries in the rulebook directory
  let entries: string[];
  try {
    entries = await fs.readdir(rulebookPath);
  } catch {
    return { migratedFiles };
  }

  for (const entry of entries) {
    // Only move .md files (not directories like tasks/, specs/, archive/)
    if (!entry.endsWith('.md')) continue;

    const sourcePath = path.join(rulebookPath, entry);
    const destPath = path.join(specsPath, entry);

    // Check if it's a file (not directory)
    try {
      const stat = await fs.stat(sourcePath);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }

    // Read content, write to specs/, then remove original
    const content = await readFile(sourcePath);
    await writeFile(destPath, content);
    await fs.unlink(sourcePath);
    migratedFiles.push(entry);
  }

  return { migratedFiles };
}
