import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installRalphScripts } from '../src/core/ralph-scripts.js';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';

describe('Ralph Scripts', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), `.test-ralph-scripts-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should install all Ralph scripts', async () => {
    const installed = await installRalphScripts(tempDir);

    expect(installed).toHaveLength(10); // 5 scripts x 2 extensions (.sh + .bat)
  });

  it('should create .sh scripts in .rulebook/scripts/', async () => {
    await installRalphScripts(tempDir);

    const shScripts = [
      'ralph-init.sh',
      'ralph-run.sh',
      'ralph-status.sh',
      'ralph-pause.sh',
      'ralph-history.sh',
    ];

    for (const script of shScripts) {
      const scriptPath = join(tempDir, '.rulebook', 'scripts', script);
      expect(existsSync(scriptPath)).toBe(true);
    }
  });

  it('should create .bat scripts in .rulebook/scripts/', async () => {
    await installRalphScripts(tempDir);

    const batScripts = [
      'ralph-init.bat',
      'ralph-run.bat',
      'ralph-status.bat',
      'ralph-pause.bat',
      'ralph-history.bat',
    ];

    for (const script of batScripts) {
      const scriptPath = join(tempDir, '.rulebook', 'scripts', script);
      expect(existsSync(scriptPath)).toBe(true);
    }
  });

  it('should return relative paths in installed list', async () => {
    const installed = await installRalphScripts(tempDir);

    for (const filePath of installed) {
      expect(filePath).toMatch(/^\.rulebook[/\\]scripts[/\\]ralph-/);
    }
  });

  it('should contain correct content in .sh scripts', async () => {
    await installRalphScripts(tempDir);

    const initSh = readFileSync(join(tempDir, '.rulebook', 'scripts', 'ralph-init.sh'), 'utf-8');
    expect(initSh).toContain('#!/bin/sh');
    expect(initSh).toContain('npx @hivehub/rulebook@latest ralph init');
  });

  it('should contain correct content in .bat scripts', async () => {
    await installRalphScripts(tempDir);

    const initBat = readFileSync(
      join(tempDir, '.rulebook', 'scripts', 'ralph-init.bat'),
      'utf-8'
    );
    expect(initBat).toContain('@echo off');
    expect(initBat).toContain('npx @hivehub/rulebook@latest ralph init');
  });

  it('should be idempotent — second call does not throw', async () => {
    await installRalphScripts(tempDir);
    const secondResult = await installRalphScripts(tempDir);

    expect(secondResult).toHaveLength(10);
  });

  it('should overwrite existing scripts on second call', async () => {
    await installRalphScripts(tempDir);

    // Verify file still has correct content after overwrite
    const secondResult = await installRalphScripts(tempDir);
    expect(secondResult).toHaveLength(10);

    const initSh = readFileSync(join(tempDir, '.rulebook', 'scripts', 'ralph-init.sh'), 'utf-8');
    expect(initSh).toContain('#!/bin/sh');
  });

  it('should create .rulebook/scripts/ directory if it does not exist', async () => {
    const scriptsDir = join(tempDir, '.rulebook', 'scripts');
    expect(existsSync(scriptsDir)).toBe(false);

    await installRalphScripts(tempDir);

    expect(existsSync(scriptsDir)).toBe(true);
  });
});
