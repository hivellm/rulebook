import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installGitHooks, uninstallGitHooks } from '../src/utils/git-hooks.js';
import type { LanguageDetection } from '../src/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('git hook installer', () => {
  let tempDir: string;
  let gitDir: string;
  let hooksDir: string;

  const tsLanguage: LanguageDetection = {
    language: 'typescript',
    confidence: 1,
    indicators: ['test'],
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-hooks-'));
    gitDir = path.join(tempDir, '.git');
    hooksDir = path.join(gitDir, 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('installs language-aware pre-commit and pre-push hooks', async () => {
    await installGitHooks({ cwd: tempDir, languages: [tsLanguage] });

    const preCommitPath = path.join(hooksDir, 'pre-commit');
    const prePushPath = path.join(hooksDir, 'pre-push');

    const preCommit = await fs.readFile(preCommitPath, 'utf-8');
    const prePush = await fs.readFile(prePushPath, 'utf-8');

    expect(preCommit).toContain('npm run lint');
    expect(preCommit).toContain('npm test');
    expect(prePush).toContain('npm test');
    expect(prePush).toContain('npm run build');
  });

  it('fails when git repository is not initialized', async () => {
    await fs.rm(gitDir, { recursive: true, force: true });

    await expect(() => installGitHooks({ cwd: tempDir, languages: [tsLanguage] }))
      .rejects.toThrowError('Git repository not initialized');
  });

  it('uninstalls previously installed hooks', async () => {
    await installGitHooks({ cwd: tempDir, languages: [tsLanguage] });

    await uninstallGitHooks(tempDir);

    await expect(fs.access(path.join(hooksDir, 'pre-commit'))).rejects.toThrow();
    await expect(fs.access(path.join(hooksDir, 'pre-push'))).rejects.toThrow();
  });
});
