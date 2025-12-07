import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  parseSkillFrontmatter,
  generateSkillFrontmatter,
  convertLegacyTemplateToSkill,
} from '../src/core/skills-manager.js';
import type { SkillMetadata, SkillCategory } from '../src/types.js';

describe('Skills Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseSkillFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
name: "TypeScript"
description: "TypeScript language rules"
version: "1.0.0"
category: "languages"
---

# TypeScript Rules

Some content here.`;

      const result = parseSkillFrontmatter(content);

      expect(result.metadata.name).toBe('TypeScript');
      expect(result.metadata.description).toBe('TypeScript language rules');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.category).toBe('languages');
      expect(result.body).toContain('# TypeScript Rules');
    });

    it('should handle content without frontmatter', () => {
      const content = `# Just Content

No frontmatter here.`;

      const result = parseSkillFrontmatter(content);

      expect(result.metadata.name).toBe('Unknown');
      expect(result.metadata.description).toBe('No description provided');
      expect(result.body).toBe(content);
    });

    it('should parse array fields', () => {
      const content = `---
name: "Test Skill"
description: "Test description"
tags: ["tag1", "tag2", "tag3"]
dependencies: ["dep1", "dep2"]
---

Content here.`;

      const result = parseSkillFrontmatter(content);

      expect(result.metadata.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.metadata.dependencies).toEqual(['dep1', 'dep2']);
    });

    it('should handle quoted strings', () => {
      const content = `---
name: "Quoted Name"
description: 'Single quoted'
---

Content`;

      const result = parseSkillFrontmatter(content);

      expect(result.metadata.name).toBe('Quoted Name');
      expect(result.metadata.description).toBe('Single quoted');
    });

    it('should handle empty frontmatter', () => {
      const content = `---
name:
---

Content`;

      const result = parseSkillFrontmatter(content);

      expect(result.metadata.name).toBe('Unknown');
      expect(result.metadata.description).toBe('No description provided');
      expect(result.body.trim()).toBe('Content');
    });

    it('should handle frontmatter with author', () => {
      const content = `---
name: "Test"
description: "Test desc"
author: "Test Author"
---

Content`;

      const result = parseSkillFrontmatter(content);

      expect(result.metadata.author).toBe('Test Author');
    });

    it('should handle conflicts array', () => {
      const content = `---
name: "Test"
description: "Test desc"
conflicts: ["skill-a", "skill-b"]
---

Content`;

      const result = parseSkillFrontmatter(content);

      expect(result.metadata.conflicts).toEqual(['skill-a', 'skill-b']);
    });
  });

  describe('generateSkillFrontmatter', () => {
    it('should generate valid frontmatter from metadata', () => {
      const metadata: SkillMetadata = {
        name: 'Test Skill',
        description: 'A test skill',
        version: '1.0.0',
        category: 'core',
        tags: ['test', 'example'],
      };

      const result = generateSkillFrontmatter(metadata);

      expect(result).toContain('---');
      expect(result).toContain('name: "Test Skill"');
      expect(result).toContain('description: "A test skill"');
      expect(result).toContain('version: "1.0.0"');
      expect(result).toContain('category: "core"');
      expect(result).toContain('tags: ["test", "example"]');
    });

    it('should omit optional fields when not provided', () => {
      const metadata: SkillMetadata = {
        name: 'Minimal',
        description: 'Minimal skill',
      };

      const result = generateSkillFrontmatter(metadata);

      expect(result).toContain('name: "Minimal"');
      expect(result).not.toContain('version:');
      expect(result).not.toContain('tags:');
    });

    it('should include dependencies and conflicts when provided', () => {
      const metadata: SkillMetadata = {
        name: 'Complex',
        description: 'Complex skill',
        dependencies: ['dep1', 'dep2'],
        conflicts: ['conflict1'],
      };

      const result = generateSkillFrontmatter(metadata);

      expect(result).toContain('dependencies: ["dep1", "dep2"]');
      expect(result).toContain('conflicts: ["conflict1"]');
    });

    it('should include author when provided', () => {
      const metadata: SkillMetadata = {
        name: 'Authored',
        description: 'Skill with author',
        author: 'Test Author',
      };

      const result = generateSkillFrontmatter(metadata);

      expect(result).toContain('author: "Test Author"');
    });

    it('should generate parseable frontmatter', () => {
      const original: SkillMetadata = {
        name: 'Round Trip',
        description: 'Test round trip',
        version: '2.0.0',
        category: 'languages',
        tags: ['test'],
      };

      const generated = generateSkillFrontmatter(original);
      const fullContent = generated + '\n\n# Content';
      const parsed = parseSkillFrontmatter(fullContent);

      expect(parsed.metadata.name).toBe(original.name);
      expect(parsed.metadata.description).toBe(original.description);
      expect(parsed.metadata.version).toBe(original.version);
      expect(parsed.metadata.category).toBe(original.category);
    });
  });

  describe('convertLegacyTemplateToSkill', () => {
    it('should convert legacy template to skill format', () => {
      const content = `<!-- TYPESCRIPT:START -->
# TypeScript Rules

Some rules here.
<!-- TYPESCRIPT:END -->`;

      const result = convertLegacyTemplateToSkill(content, 'TYPESCRIPT.md', 'languages');

      expect(result.metadata.name).toBe('Typescript');
      expect(result.metadata.category).toBe('languages');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.content).toBe(content);
    });

    it('should extract description from first non-header line', () => {
      const content = `# Header
This is the description line.
More content.`;

      const result = convertLegacyTemplateToSkill(content, 'TEST.md', 'core');

      expect(result.metadata.description).toBe('This is the description line.');
    });

    it('should handle underscore in filename', () => {
      const result = convertLegacyTemplateToSkill('# Content', 'MY_SKILL.md', 'core');

      expect(result.metadata.name).toBe('My Skill');
    });

    it('should handle lowercase filename', () => {
      const result = convertLegacyTemplateToSkill('# Content', 'python.md', 'languages');

      expect(result.metadata.name).toBe('Python');
    });

    it('should add category to tags', () => {
      const result = convertLegacyTemplateToSkill('# Content', 'TEST.md', 'frameworks');

      expect(result.metadata.tags).toContain('frameworks');
    });

    it('should truncate long descriptions', () => {
      const longLine = 'A'.repeat(200);
      const content = `# Header
${longLine}
More content.`;

      const result = convertLegacyTemplateToSkill(content, 'TEST.md', 'core');

      expect(result.metadata.description.length).toBeLessThanOrEqual(150);
    });

    it('should skip comment lines when finding description', () => {
      const content = `# Header
<!-- This is a comment -->
This is the actual description.`;

      const result = convertLegacyTemplateToSkill(content, 'TEST.md', 'core');

      expect(result.metadata.description).toBe('This is the actual description.');
    });

    it('should use default description when content is only headers', () => {
      const content = `# Header Only
## Another Header
### Third Header`;

      const result = convertLegacyTemplateToSkill(content, 'EMPTY.md', 'core');

      expect(result.metadata.description).toContain('Empty');
    });
  });

  describe('Skill ID generation', () => {
    it('should generate kebab-case IDs', () => {
      const result = convertLegacyTemplateToSkill('# Content', 'MY_COMPLEX_SKILL.md', 'core');

      // The skill itself doesn't include ID, but we can verify name formatting
      expect(result.metadata.name).toBe('My Complex Skill');
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed YAML gracefully', () => {
      const content = `---
name: unclosed string
description
---

Content`;

      // Should not throw
      const result = parseSkillFrontmatter(content);
      expect(result).toBeDefined();
    });

    it('should handle empty content', () => {
      const result = convertLegacyTemplateToSkill('', 'EMPTY.md', 'core');

      expect(result.metadata.name).toBe('Empty');
      expect(result.content).toBe('');
    });

    it('should handle content with only whitespace', () => {
      const result = convertLegacyTemplateToSkill('   \n\n   ', 'SPACE.md', 'core');

      expect(result.metadata.name).toBe('Space');
    });

    it('should preserve original content exactly', () => {
      const originalContent = `# Original
With special chars: <>&"'
\`\`\`code\`\`\`
- List item`;

      const result = convertLegacyTemplateToSkill(originalContent, 'TEST.md', 'core');

      expect(result.content).toBe(originalContent);
    });
  });

  describe('Category handling', () => {
    const categories: SkillCategory[] = [
      'languages',
      'frameworks',
      'modules',
      'services',
      'workflows',
      'ides',
      'core',
      'cli',
      'git',
      'hooks',
    ];

    it.each(categories)('should handle %s category', (category) => {
      const result = convertLegacyTemplateToSkill('# Content', 'TEST.md', category);

      expect(result.metadata.category).toBe(category);
      expect(result.metadata.tags).toContain(category);
    });
  });
});
