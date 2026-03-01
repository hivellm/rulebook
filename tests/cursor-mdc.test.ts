import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  isCursorInstalled,
  generateCursorMdcRules,
} from '../src/core/cursor-mdc-generator.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'cursor-mdc-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('isCursorInstalled', () => {
  it('returns false when no cursor artifacts exist', () => {
    expect(isCursorInstalled(tmpDir)).toBe(false);
  });

  it('returns true when .cursor/ directory exists', async () => {
    await mkdir(join(tmpDir, '.cursor'), { recursive: true });
    expect(isCursorInstalled(tmpDir)).toBe(true);
  });

  it('returns true when .cursorrules file exists', async () => {
    const { writeFile } = await import('fs/promises');
    await writeFile(join(tmpDir, '.cursorrules'), '# rules');
    expect(isCursorInstalled(tmpDir)).toBe(true);
  });
});

describe('generateCursorMdcRules', () => {
  it('creates .cursor/rules/ directory', async () => {
    await generateCursorMdcRules(tmpDir, { languages: [], ralphEnabled: false });
    expect(existsSync(join(tmpDir, '.cursor', 'rules'))).toBe(true);
  });

  it('always generates rulebook.mdc and quality.mdc', async () => {
    const result = await generateCursorMdcRules(tmpDir, { languages: [], ralphEnabled: false });
    expect(result.generated).toContain('rulebook.mdc');
    expect(result.generated).toContain('quality.mdc');
    expect(existsSync(join(tmpDir, '.cursor', 'rules', 'rulebook.mdc'))).toBe(true);
    expect(existsSync(join(tmpDir, '.cursor', 'rules', 'quality.mdc'))).toBe(true);
  });

  it('generates ralph.mdc when ralphEnabled is true', async () => {
    const result = await generateCursorMdcRules(tmpDir, { languages: [], ralphEnabled: true });
    expect(result.generated).toContain('ralph.mdc');
    expect(existsSync(join(tmpDir, '.cursor', 'rules', 'ralph.mdc'))).toBe(true);
  });

  it('does not generate ralph.mdc when ralphEnabled is false', async () => {
    const result = await generateCursorMdcRules(tmpDir, { languages: [], ralphEnabled: false });
    expect(result.generated).not.toContain('ralph.mdc');
    expect(existsSync(join(tmpDir, '.cursor', 'rules', 'ralph.mdc'))).toBe(false);
  });

  it('generates typescript.mdc for TypeScript projects', async () => {
    const result = await generateCursorMdcRules(tmpDir, {
      languages: ['typescript'],
      ralphEnabled: false,
    });
    expect(result.generated).toContain('typescript.mdc');
    expect(existsSync(join(tmpDir, '.cursor', 'rules', 'typescript.mdc'))).toBe(true);
  });

  it('generates typescript.mdc for JavaScript projects (shared template)', async () => {
    const result = await generateCursorMdcRules(tmpDir, {
      languages: ['javascript'],
      ralphEnabled: false,
    });
    expect(result.generated).toContain('typescript.mdc');
  });

  it('generates python.mdc for Python projects', async () => {
    const result = await generateCursorMdcRules(tmpDir, {
      languages: ['python'],
      ralphEnabled: false,
    });
    expect(result.generated).toContain('python.mdc');
    expect(existsSync(join(tmpDir, '.cursor', 'rules', 'python.mdc'))).toBe(true);
  });

  it('generates rust.mdc for Rust projects', async () => {
    const result = await generateCursorMdcRules(tmpDir, {
      languages: ['rust'],
      ralphEnabled: false,
    });
    expect(result.generated).toContain('rust.mdc');
  });

  it('generates go.mdc for Go projects', async () => {
    const result = await generateCursorMdcRules(tmpDir, {
      languages: ['go'],
      ralphEnabled: false,
    });
    expect(result.generated).toContain('go.mdc');
  });

  it('does not duplicate typescript.mdc for typescript + javascript', async () => {
    const result = await generateCursorMdcRules(tmpDir, {
      languages: ['typescript', 'javascript'],
      ralphEnabled: false,
    });
    const tsCount = result.generated.filter((f) => f === 'typescript.mdc').length;
    expect(tsCount).toBe(1);
  });

  it('skips unknown languages without error', async () => {
    const result = await generateCursorMdcRules(tmpDir, {
      languages: ['cobol', 'fortran'],
      ralphEnabled: false,
    });
    // Only rulebook.mdc and quality.mdc should be generated
    expect(result.generated).toHaveLength(2);
  });

  it('generated rulebook.mdc contains alwaysApply: true', async () => {
    await generateCursorMdcRules(tmpDir, { languages: [], ralphEnabled: false });
    const content = await readFile(join(tmpDir, '.cursor', 'rules', 'rulebook.mdc'), 'utf-8');
    expect(content).toContain('alwaysApply: true');
  });

  it('generated typescript.mdc contains correct globs', async () => {
    await generateCursorMdcRules(tmpDir, { languages: ['typescript'], ralphEnabled: false });
    const content = await readFile(join(tmpDir, '.cursor', 'rules', 'typescript.mdc'), 'utf-8');
    expect(content).toContain('**/*.ts');
  });

  it('is idempotent — second call does not throw', async () => {
    await generateCursorMdcRules(tmpDir, { languages: ['typescript'], ralphEnabled: true });
    await expect(
      generateCursorMdcRules(tmpDir, { languages: ['typescript'], ralphEnabled: true })
    ).resolves.not.toThrow();
  });
});
