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

    const preCommitShellPath = path.join(hooksDir, 'pre-commit');
    const preCommitNodePath = path.join(hooksDir, 'pre-commit.js');
    const prePushShellPath = path.join(hooksDir, 'pre-push');
    const prePushNodePath = path.join(hooksDir, 'pre-push.js');

    const preCommitShell = await fs.readFile(preCommitShellPath, 'utf-8');
    const preCommitNode = await fs.readFile(preCommitNodePath, 'utf-8');
    const prePushShell = await fs.readFile(prePushShellPath, 'utf-8');
    const prePushNode = await fs.readFile(prePushNodePath, 'utf-8');

    // Shell wrappers should have shebang
    expect(preCommitShell).toMatch(/^#!\/bin\/sh\n/);
    expect(prePushShell).toMatch(/^#!\/bin\/sh\n/);

    // Node scripts should contain the actual commands
    expect(preCommitNode).toMatch(/npm.*lint/);
    expect(prePushNode).toMatch(/npm.*build/);
  });

  it('fails when git repository is not initialized', async () => {
    await fs.rm(gitDir, { recursive: true, force: true });

    await expect(() =>
      installGitHooks({ cwd: tempDir, languages: [tsLanguage] })
    ).rejects.toThrowError('Git repository not initialized');
  });

  it('uninstalls previously installed hooks', async () => {
    await installGitHooks({ cwd: tempDir, languages: [tsLanguage] });

    await uninstallGitHooks(tempDir);

    // Both shell wrappers and Node.js scripts should be removed
    await expect(fs.access(path.join(hooksDir, 'pre-commit'))).rejects.toThrow();
    await expect(fs.access(path.join(hooksDir, 'pre-commit.js'))).rejects.toThrow();
    await expect(fs.access(path.join(hooksDir, 'pre-push'))).rejects.toThrow();
    await expect(fs.access(path.join(hooksDir, 'pre-push.js'))).rejects.toThrow();
  });

  it('generates Rust-specific hooks', async () => {
    const rustLanguage: LanguageDetection = {
      language: 'rust',
      confidence: 1,
      indicators: ['Cargo.toml'],
    };

    await installGitHooks({ cwd: tempDir, languages: [rustLanguage] });

    const preCommitNode = await fs.readFile(path.join(hooksDir, 'pre-commit.js'), 'utf-8');
    const prePushNode = await fs.readFile(path.join(hooksDir, 'pre-push.js'), 'utf-8');

    expect(preCommitNode).toMatch(/cargo.*fmt/);
    expect(preCommitNode).toMatch(/cargo.*clippy/);
    expect(prePushNode).toMatch(/cargo.*build/);
  });

  it('generates Python-specific hooks', async () => {
    const pythonLanguage: LanguageDetection = {
      language: 'python',
      confidence: 1,
      indicators: ['pyproject.toml'],
    };

    await installGitHooks({ cwd: tempDir, languages: [pythonLanguage] });

    const preCommitNode = await fs.readFile(path.join(hooksDir, 'pre-commit.js'), 'utf-8');
    const prePushNode = await fs.readFile(path.join(hooksDir, 'pre-push.js'), 'utf-8');

    expect(preCommitNode).toMatch(/black/);
    expect(preCommitNode).toMatch(/ruff/);
    expect(preCommitNode).toMatch(/mypy/);
    expect(prePushNode).toMatch(/pytest/);
  });

  it('generates Go-specific hooks', async () => {
    const goLanguage: LanguageDetection = {
      language: 'go',
      confidence: 1,
      indicators: ['go.mod'],
    };

    await installGitHooks({ cwd: tempDir, languages: [goLanguage] });

    const preCommitNode = await fs.readFile(path.join(hooksDir, 'pre-commit.js'), 'utf-8');
    const prePushNode = await fs.readFile(path.join(hooksDir, 'pre-push.js'), 'utf-8');

    expect(preCommitNode).toMatch(/gofmt/);
    expect(preCommitNode).toMatch(/go.*vet/);
    expect(prePushNode).toMatch(/go.*test/);
    expect(prePushNode).toMatch(/go.*build/);
  });

  it('combines hooks for multiple languages', async () => {
    const languages: LanguageDetection[] = [
      { language: 'typescript', confidence: 0.9, indicators: ['package.json'] },
      { language: 'rust', confidence: 0.8, indicators: ['Cargo.toml'] },
    ];

    await installGitHooks({ cwd: tempDir, languages });

    const preCommitNode = await fs.readFile(path.join(hooksDir, 'pre-commit.js'), 'utf-8');
    const prePushNode = await fs.readFile(path.join(hooksDir, 'pre-push.js'), 'utf-8');

    // Should contain both TypeScript and Rust checks
    expect(preCommitNode).toMatch(/npm.*lint/);
    expect(preCommitNode).toMatch(/cargo.*fmt/);
    expect(prePushNode).toMatch(/npm.*build/);
    expect(prePushNode).toMatch(/cargo.*build/);
  });

  it('generates generic hooks for unsupported languages', async () => {
    const unsupportedLanguage: LanguageDetection = {
      language: 'sql' as any, // SQL not in LANGUAGE_HOOK_MAP
      confidence: 1,
      indicators: ['schema.sql'],
    };

    await installGitHooks({ cwd: tempDir, languages: [unsupportedLanguage] });

    const preCommitNode = await fs.readFile(path.join(hooksDir, 'pre-commit.js'), 'utf-8');
    const prePushNode = await fs.readFile(path.join(hooksDir, 'pre-push.js'), 'utf-8');

    // Should have generic fallback or empty (no commands)
    // Empty hooks just exit successfully
    expect(preCommitNode).toBeDefined();
    expect(prePushNode).toBeDefined();
  });

  it('sets executable permissions on hook files', async () => {
    await installGitHooks({ cwd: tempDir, languages: [tsLanguage] });

    const preCommitStats = await fs.stat(path.join(hooksDir, 'pre-commit'));
    const prePushStats = await fs.stat(path.join(hooksDir, 'pre-push'));

    // Check if files exist and have correct mode set
    // On Unix: mode includes execute bit (0o111)
    // On Windows: mode check may not work the same way
    if (process.platform !== 'win32') {
      expect(preCommitStats.mode & 0o111).toBeGreaterThan(0);
      expect(prePushStats.mode & 0o111).toBeGreaterThan(0);
    } else {
      // On Windows, just verify files were created
      expect(preCommitStats.isFile()).toBe(true);
      expect(prePushStats.isFile()).toBe(true);
    }
  });

  it('generates hooks with proper shebang in shell wrappers', async () => {
    await installGitHooks({ cwd: tempDir, languages: [tsLanguage] });

    const preCommitShell = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    const prePushShell = await fs.readFile(path.join(hooksDir, 'pre-push'), 'utf-8');

    // Shell wrappers should have shebang
    expect(preCommitShell).toMatch(/^#!\/bin\/sh\n/);
    expect(prePushShell).toMatch(/^#!\/bin\/sh\n/);

    // Node.js scripts should not have shebang (they're executed by the wrapper)
    const preCommitNode = await fs.readFile(path.join(hooksDir, 'pre-commit.js'), 'utf-8');
    const prePushNode = await fs.readFile(path.join(hooksDir, 'pre-push.js'), 'utf-8');

    expect(preCommitNode).not.toMatch(/^#!\/usr\/bin\/env node/);
    expect(prePushNode).not.toMatch(/^#!\/usr\/bin\/env node/);
  });
});
