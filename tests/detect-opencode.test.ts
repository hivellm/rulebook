import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectProject, detectOpencode } from '../src/core/detect/detector';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('detectOpencode', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-opencode-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('detects opencode.json', async () => {
    await fs.writeFile(path.join(dir, 'opencode.json'), '{}');
    const r = await detectOpencode(dir);
    expect(r.detected).toBe(true);
    expect(r.hasConfigJson).toBe(true);
    expect(r.hasOpencodeDir).toBe(false);
  });

  it('detects opencode.jsonc', async () => {
    await fs.writeFile(path.join(dir, 'opencode.jsonc'), '{}');
    const r = await detectOpencode(dir);
    expect(r.detected).toBe(true);
    expect(r.hasConfigJson).toBe(true);
  });

  it('detects .opencode/ directory', async () => {
    await fs.mkdir(path.join(dir, '.opencode'));
    const r = await detectOpencode(dir);
    expect(r.detected).toBe(true);
    expect(r.hasOpencodeDir).toBe(true);
    expect(r.hasConfigJson).toBe(false);
  });

  it('returns false when no signal exists', async () => {
    const r = await detectOpencode(dir);
    expect(r.detected).toBe(false);
    expect(r.hasConfigJson).toBe(false);
    expect(r.hasOpencodeDir).toBe(false);
  });

  it('exposes opencode field on the aggregate detection result', async () => {
    await fs.writeFile(path.join(dir, 'opencode.json'), '{}');
    const r = await detectProject(dir);
    expect(r.opencode).toBeDefined();
    expect(r.opencode?.detected).toBe(true);
  });
});
