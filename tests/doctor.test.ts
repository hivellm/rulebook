import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runDoctor } from '../src/core/doctor';

describe('doctor (v5.3.0 F7)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-doctor-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  it('reports missing required files', async () => {
    const report = await runDoctor(projectRoot);
    const reqCheck = report.checks.find((c) => c.name === 'Required files');
    expect(reqCheck?.status).toBe('fail');
    expect(reqCheck?.message).toContain('CLAUDE.md');
  });

  it('reports pass when CLAUDE.md is under budget', async () => {
    await fs.writeFile(path.join(projectRoot, 'CLAUDE.md'), '# Short\n'.repeat(50));
    const report = await runDoctor(projectRoot);
    const sizeCheck = report.checks.find((c) => c.name === 'CLAUDE.md size');
    expect(sizeCheck?.status).toBe('pass');
  });

  it('warns when CLAUDE.md exceeds 200 lines', async () => {
    await fs.writeFile(path.join(projectRoot, 'CLAUDE.md'), 'line\n'.repeat(250));
    const report = await runDoctor(projectRoot);
    const sizeCheck = report.checks.find((c) => c.name === 'CLAUDE.md size');
    expect(sizeCheck?.status).toBe('warn');
    expect(sizeCheck?.message).toContain('251');
  });

  it('detects broken @imports in CLAUDE.md', async () => {
    await fs.writeFile(
      path.join(projectRoot, 'CLAUDE.md'),
      '# Test\n@nonexistent-file.md\n'
    );
    const report = await runDoctor(projectRoot);
    const importCheck = report.checks.find((c) => c.name === 'CLAUDE.md @imports');
    expect(importCheck?.status).toBe('fail');
    expect(importCheck?.message).toContain('nonexistent-file.md');
  });

  it('passes when all @imports resolve', async () => {
    await fs.writeFile(path.join(projectRoot, 'AGENTS.md'), '# Agents');
    await fs.writeFile(
      path.join(projectRoot, 'CLAUDE.md'),
      '# Test\n@AGENTS.md\n'
    );
    const report = await runDoctor(projectRoot);
    const importCheck = report.checks.find((c) => c.name === 'CLAUDE.md @imports');
    expect(importCheck?.status).toBe('pass');
  });

  it('report has correct counts', async () => {
    const report = await runDoctor(projectRoot);
    expect(report.passCount + report.warnCount + report.failCount).toBe(report.checks.length);
  });
});
