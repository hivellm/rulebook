import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateDocsStructure } from '../src/core/docs-generator';
import type { DocsConfig } from '../src/core/docs-generator';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileExists } from '../src/utils/file-system';

describe('docs-generator', () => {
  let testDir: string;
  const baseConfig: DocsConfig = {
    projectName: 'Sample Project',
    description: 'Concise description for the project.',
    author: 'Rulebook',
    license: 'MIT',
  };

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-docs-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('generates minimal documentation structure with concise README', async () => {
    const generated = await generateDocsStructure(baseConfig, testDir, 'minimal');

    const readmePath = path.join(testDir, 'README.md');
    const docsDir = path.join(testDir, 'docs');

    expect(generated).toContain(readmePath);
    expect(await fileExists(path.join(docsDir, 'ARCHITECTURE.md'))).toBe(true);
    expect(await fileExists(path.join(docsDir, 'DEVELOPMENT.md'))).toBe(true);
    expect(await fileExists(path.join(docsDir, 'ROADMAP.md'))).toBe(true);

    // Minimal mode should not generate contributing/security files by default
    expect(await fileExists(path.join(testDir, 'CONTRIBUTING.md'))).toBe(false);
    expect(await fileExists(path.join(testDir, 'CODE_OF_CONDUCT.md'))).toBe(false);
    expect(await fileExists(path.join(testDir, 'SECURITY.md'))).toBe(false);

    const readme = await fs.readFile(readmePath, 'utf-8');
    expect(readme).toContain('## Quick Start');
    expect(readme).toContain('Architecture');
    expect(readme).not.toContain('Contributing');
  });

  it('generates full documentation structure with community files', async () => {
    const generated = await generateDocsStructure(baseConfig, testDir, 'full');

    const readmePath = path.join(testDir, 'README.md');
    expect(generated).toContain(readmePath);

    expect(await fileExists(path.join(testDir, 'CONTRIBUTING.md'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'CODE_OF_CONDUCT.md'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'SECURITY.md'))).toBe(true);
    expect(await fileExists(path.join(testDir, 'docs', 'DAG.md'))).toBe(true);

    const readme = await fs.readFile(readmePath, 'utf-8');
    expect(readme).toContain('Community & Support');
    expect(readme).toContain('Contributing');
  });
});
