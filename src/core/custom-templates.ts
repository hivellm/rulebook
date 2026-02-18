import { readFile, writeFile, fileExists, ensureDir } from '../utils/file-system.js';
import path from 'path';
import { readdir } from 'fs/promises';

export interface CustomTemplate {
  name: string;
  type: 'language' | 'module' | 'workflow' | 'ide' | 'cli' | 'service';
  path: string;
  content: string;
}

/**
 * Get custom templates directory
 */
function getCustomTemplatesDir(projectDir: string): string {
  return path.join(projectDir, '.rulebook', 'templates');
}

/**
 * Load custom templates from project
 */
export async function loadCustomTemplates(projectDir: string): Promise<CustomTemplate[]> {
  const customTemplatesDir = getCustomTemplatesDir(projectDir);

  if (!(await fileExists(customTemplatesDir))) {
    return [];
  }

  const templates: CustomTemplate[] = [];
  const types = ['language', 'module', 'workflow', 'ide', 'cli', 'service'];

  for (const type of types) {
    const typeDir = path.join(customTemplatesDir, type);

    if (await fileExists(typeDir)) {
      try {
        const files = await readdir(typeDir);

        for (const file of files) {
          if (file.endsWith('.md') || file.endsWith('.yml')) {
            const filePath = path.join(typeDir, file);
            const content = await readFile(filePath);

            templates.push({
              name: file.replace(/\.(md|yml)$/, ''),
              type: type as CustomTemplate['type'],
              path: filePath,
              content,
            });
          }
        }
      } catch {
        // Ignore errors reading directory
      }
    }
  }

  return templates;
}

/**
 * Create custom template
 */
export async function createCustomTemplate(
  projectDir: string,
  template: Omit<CustomTemplate, 'path'>
): Promise<string> {
  const customTemplatesDir = getCustomTemplatesDir(projectDir);
  const typeDir = path.join(customTemplatesDir, template.type);

  await ensureDir(typeDir);

  const extension = template.type === 'workflow' ? 'yml' : 'md';
  const fileName = `${template.name}.${extension}`;
  const filePath = path.join(typeDir, fileName);

  await writeFile(filePath, template.content);

  return filePath;
}

/**
 * Get custom template by name and type
 */
export async function getCustomTemplate(
  projectDir: string,
  name: string,
  type: CustomTemplate['type']
): Promise<CustomTemplate | null> {
  const templates = await loadCustomTemplates(projectDir);
  return templates.find((t) => t.name === name && t.type === type) || null;
}

/**
 * List custom templates
 */
export async function listCustomTemplates(
  projectDir: string
): Promise<Record<string, CustomTemplate[]>> {
  const templates = await loadCustomTemplates(projectDir);

  return {
    language: templates.filter((t) => t.type === 'language'),
    module: templates.filter((t) => t.type === 'module'),
    workflow: templates.filter((t) => t.type === 'workflow'),
    ide: templates.filter((t) => t.type === 'ide'),
    cli: templates.filter((t) => t.type === 'cli'),
    service: templates.filter((t) => t.type === 'service'),
  };
}

/**
 * Initialize custom templates directory structure
 */
export async function initializeCustomTemplates(projectDir: string): Promise<void> {
  const customTemplatesDir = getCustomTemplatesDir(projectDir);

  await ensureDir(path.join(customTemplatesDir, 'language'));
  await ensureDir(path.join(customTemplatesDir, 'module'));
  await ensureDir(path.join(customTemplatesDir, 'workflow'));
  await ensureDir(path.join(customTemplatesDir, 'ide'));
  await ensureDir(path.join(customTemplatesDir, 'cli'));
  await ensureDir(path.join(customTemplatesDir, 'service'));

  // Create README
  const readmePath = path.join(customTemplatesDir, 'README.md');
  const readmeContent = `# Custom Templates

This directory contains custom templates for your project.

## Structure

\`\`\`
.rulebook/templates/
├── language/   # Custom language templates
├── module/     # Custom module templates
├── workflow/   # Custom workflow templates
├── ide/        # Custom IDE templates
├── cli/        # Custom CLI tool templates
└── service/    # Custom service templates
\`\`\`

## Creating Custom Templates

1. Add your template file to the appropriate directory
2. Use the same format as built-in templates
3. Include start/end markers: \`<!-- CUSTOM_NAME:START -->\` and \`<!-- CUSTOM_NAME:END -->\`

## Usage

Custom templates are automatically detected and merged with built-in templates.

Run \`rulebook init\` and select your custom templates from the prompts.
`;

  await writeFile(readmePath, readmeContent);
}
