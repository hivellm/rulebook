import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  getOverridePath,
  overrideExists,
  readOverrideContent,
  initOverride,
  clearOverride,
} from '../src/core/override-manager.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'override-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('getOverridePath', () => {
  it('returns path to AGENTS.override.md in project root', () => {
    const result = getOverridePath('/some/project');
    expect(result).toMatch(/AGENTS\.override\.md$/);
    expect(result).toContain('some');
    expect(result).toContain('project');
  });
});

describe('overrideExists', () => {
  it('returns false when file does not exist', () => {
    expect(overrideExists(tmpDir)).toBe(false);
  });

  it('returns true when file exists', async () => {
    await writeFile(join(tmpDir, 'AGENTS.override.md'), '# Override');
    expect(overrideExists(tmpDir)).toBe(true);
  });
});

describe('readOverrideContent', () => {
  it('returns empty string when file does not exist', async () => {
    const result = await readOverrideContent(tmpDir);
    expect(result).toBe('');
  });

  it('returns empty string for template-only content (no custom rules)', async () => {
    const templateContent = [
      '<!-- OVERRIDE:START -->',
      '# Project-Specific Overrides',
      '',
      'This file contains project-specific directives that are never overwritten.',
      '<!-- OVERRIDE:END -->',
    ].join('\n');
    await writeFile(join(tmpDir, 'AGENTS.override.md'), templateContent);
    const result = await readOverrideContent(tmpDir);
    expect(result).toBe('');
  });

  it('returns custom content stripped of markers', async () => {
    const content = [
      '<!-- OVERRIDE:START -->',
      '# Project-Specific Overrides',
      '',
      '- Always use PostgreSQL for databases',
      '- Use Redis for caching',
      '<!-- OVERRIDE:END -->',
    ].join('\n');
    await writeFile(join(tmpDir, 'AGENTS.override.md'), content);
    const result = await readOverrideContent(tmpDir);
    expect(result).toContain('Always use PostgreSQL');
    expect(result).toContain('Use Redis for caching');
    expect(result).not.toContain('<!-- OVERRIDE:START -->');
    expect(result).not.toContain('<!-- OVERRIDE:END -->');
  });

  it('returns raw content when no markers present', async () => {
    const content = '# My custom rules\n\n- Rule A\n- Rule B\n';
    await writeFile(join(tmpDir, 'AGENTS.override.md'), content);
    const result = await readOverrideContent(tmpDir);
    expect(result).toContain('Rule A');
    expect(result).toContain('Rule B');
  });
});

describe('initOverride', () => {
  it('creates AGENTS.override.md when it does not exist', async () => {
    const created = await initOverride(tmpDir);
    expect(created).toBe(true);
    expect(existsSync(join(tmpDir, 'AGENTS.override.md'))).toBe(true);
  });

  it('does not overwrite existing AGENTS.override.md', async () => {
    const customContent = '# My custom content\n- Rule A\n';
    await writeFile(join(tmpDir, 'AGENTS.override.md'), customContent);

    const created = await initOverride(tmpDir);
    expect(created).toBe(false);

    // Content must be preserved
    const result = await readOverrideContent(tmpDir);
    // Raw file is unchanged
    const raw = await import('fs/promises').then((m) =>
      m.readFile(join(tmpDir, 'AGENTS.override.md'), 'utf-8')
    );
    expect(raw).toBe(customContent);
  });

  it('is idempotent — second call returns false and does not modify file', async () => {
    await initOverride(tmpDir);
    const firstContent = await import('fs/promises').then((m) =>
      m.readFile(join(tmpDir, 'AGENTS.override.md'), 'utf-8')
    );

    const second = await initOverride(tmpDir);
    expect(second).toBe(false);

    const secondContent = await import('fs/promises').then((m) =>
      m.readFile(join(tmpDir, 'AGENTS.override.md'), 'utf-8')
    );
    expect(secondContent).toBe(firstContent);
  });

  it('created file contains OVERRIDE markers', async () => {
    await initOverride(tmpDir);
    const content = await import('fs/promises').then((m) =>
      m.readFile(join(tmpDir, 'AGENTS.override.md'), 'utf-8')
    );
    expect(content).toContain('<!-- OVERRIDE:START -->');
    expect(content).toContain('<!-- OVERRIDE:END -->');
  });
});

describe('clearOverride', () => {
  it('resets file, removing previous custom content', async () => {
    const customContent = [
      '<!-- OVERRIDE:START -->',
      '# Custom rules',
      '- Always use TypeScript strict mode',
      '<!-- OVERRIDE:END -->',
    ].join('\n');
    await writeFile(join(tmpDir, 'AGENTS.override.md'), customContent);

    await clearOverride(tmpDir);

    const raw = await import('fs/promises').then((m) =>
      m.readFile(join(tmpDir, 'AGENTS.override.md'), 'utf-8')
    );
    // Custom content must be gone
    expect(raw).not.toContain('Always use TypeScript strict mode');
    // But markers and placeholder must be present
    expect(raw).toContain('<!-- OVERRIDE:START -->');
    expect(raw).toContain('<!-- OVERRIDE:END -->');
  });

  it('creates file if it did not exist', async () => {
    await clearOverride(tmpDir);
    expect(existsSync(join(tmpDir, 'AGENTS.override.md'))).toBe(true);
  });

  it('file after clear contains OVERRIDE markers', async () => {
    await clearOverride(tmpDir);
    const content = await import('fs/promises').then((m) =>
      m.readFile(join(tmpDir, 'AGENTS.override.md'), 'utf-8')
    );
    expect(content).toContain('<!-- OVERRIDE:START -->');
    expect(content).toContain('<!-- OVERRIDE:END -->');
  });
});
