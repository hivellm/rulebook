import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectMonorepo } from '../src/core/detector.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'monorepo-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function createPackage(base: string, rel: string) {
  const dir = join(base, rel);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: rel }));
}

describe('detectMonorepo', () => {
  it('returns detected: false for plain projects', async () => {
    const result = await detectMonorepo(tmpDir);
    expect(result.detected).toBe(false);
    expect(result.tool).toBe(null);
    expect(result.packages).toHaveLength(0);
  });

  it('detects turborepo via turbo.json', async () => {
    await writeFile(join(tmpDir, 'turbo.json'), '{}');
    await createPackage(tmpDir, 'packages/api');
    await createPackage(tmpDir, 'packages/web');

    const result = await detectMonorepo(tmpDir);
    expect(result.detected).toBe(true);
    expect(result.tool).toBe('turborepo');
    expect(result.packages).toContain('packages/api');
    expect(result.packages).toContain('packages/web');
  });

  it('detects nx via nx.json', async () => {
    await writeFile(join(tmpDir, 'nx.json'), '{}');
    await createPackage(tmpDir, 'packages/core');

    const result = await detectMonorepo(tmpDir);
    expect(result.detected).toBe(true);
    expect(result.tool).toBe('nx');
  });

  it('detects pnpm workspaces via pnpm-workspace.yaml', async () => {
    await writeFile(join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
    await createPackage(tmpDir, 'packages/utils');

    const result = await detectMonorepo(tmpDir);
    expect(result.detected).toBe(true);
    expect(result.tool).toBe('pnpm');
  });

  it('detects lerna via lerna.json', async () => {
    await writeFile(join(tmpDir, 'lerna.json'), '{"version": "0.0.0"}');
    await createPackage(tmpDir, 'packages/shared');

    const result = await detectMonorepo(tmpDir);
    expect(result.detected).toBe(true);
    expect(result.tool).toBe('lerna');
  });

  it('detects manual monorepo with 2+ packages', async () => {
    await createPackage(tmpDir, 'packages/backend');
    await createPackage(tmpDir, 'packages/frontend');

    const result = await detectMonorepo(tmpDir);
    expect(result.detected).toBe(true);
    expect(result.tool).toBe('manual');
    expect(result.packages).toHaveLength(2);
  });

  it('does not detect manual monorepo with only 1 package', async () => {
    await createPackage(tmpDir, 'packages/only-one');

    const result = await detectMonorepo(tmpDir);
    expect(result.detected).toBe(false);
  });

  it('discovers packages in apps/ directory', async () => {
    await writeFile(join(tmpDir, 'turbo.json'), '{}');
    await createPackage(tmpDir, 'apps/web');
    await createPackage(tmpDir, 'apps/mobile');

    const result = await detectMonorepo(tmpDir);
    expect(result.packages).toContain('apps/web');
    expect(result.packages).toContain('apps/mobile');
  });

  it('discovers packages in libs/ directory', async () => {
    await writeFile(join(tmpDir, 'turbo.json'), '{}');
    await createPackage(tmpDir, 'libs/utils');
    await createPackage(tmpDir, 'libs/auth');

    const result = await detectMonorepo(tmpDir);
    expect(result.packages).toContain('libs/utils');
    expect(result.packages).toContain('libs/auth');
  });

  it('only includes directories with package.json', async () => {
    await writeFile(join(tmpDir, 'turbo.json'), '{}');
    await mkdir(join(tmpDir, 'packages', 'no-pkg'), { recursive: true }); // no package.json
    await createPackage(tmpDir, 'packages/has-pkg');

    const result = await detectMonorepo(tmpDir);
    expect(result.packages).toContain('packages/has-pkg');
    expect(result.packages).not.toContain('packages/no-pkg');
  });
});
