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

    await expect(() =>
      installGitHooks({ cwd: tempDir, languages: [tsLanguage] })
    ).rejects.toThrowError('Git repository not initialized');
  });

  it('uninstalls previously installed hooks', async () => {
    await installGitHooks({ cwd: tempDir, languages: [tsLanguage] });

    await uninstallGitHooks(tempDir);

    await expect(fs.access(path.join(hooksDir, 'pre-commit'))).rejects.toThrow();
    await expect(fs.access(path.join(hooksDir, 'pre-push'))).rejects.toThrow();
  });

  it('generates Rust-specific hooks', async () => {
    const rustLanguage: LanguageDetection = {
      language: 'rust',
      confidence: 1,
      indicators: ['Cargo.toml'],
    };

    await installGitHooks({ cwd: tempDir, languages: [rustLanguage] });

    const preCommit = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    const prePush = await fs.readFile(path.join(hooksDir, 'pre-push'), 'utf-8');

    expect(preCommit).toContain('cargo fmt');
    expect(preCommit).toContain('cargo clippy');
    expect(prePush).toContain('cargo build --release');
  });

  it('generates Python-specific hooks', async () => {
    const pythonLanguage: LanguageDetection = {
      language: 'python',
      confidence: 1,
      indicators: ['pyproject.toml'],
    };

    await installGitHooks({ cwd: tempDir, languages: [pythonLanguage] });

    const preCommit = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    const prePush = await fs.readFile(path.join(hooksDir, 'pre-push'), 'utf-8');

    expect(preCommit).toContain('black');
    expect(preCommit).toContain('ruff');
    expect(preCommit).toContain('mypy');
    expect(prePush).toContain('pytest');
  });

  it('generates Go-specific hooks', async () => {
    const goLanguage: LanguageDetection = {
      language: 'go',
      confidence: 1,
      indicators: ['go.mod'],
    };

    await installGitHooks({ cwd: tempDir, languages: [goLanguage] });

    const preCommit = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    const prePush = await fs.readFile(path.join(hooksDir, 'pre-push'), 'utf-8');

    expect(preCommit).toContain('gofmt');
    expect(preCommit).toContain('go vet');
    expect(prePush).toContain('go test');
    expect(prePush).toContain('go build');
  });

  it('combines hooks for multiple languages', async () => {
    const languages: LanguageDetection[] = [
      { language: 'typescript', confidence: 0.9, indicators: ['package.json'] },
      { language: 'rust', confidence: 0.8, indicators: ['Cargo.toml'] },
    ];

    await installGitHooks({ cwd: tempDir, languages });

    const preCommit = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    const prePush = await fs.readFile(path.join(hooksDir, 'pre-push'), 'utf-8');

    // Should contain both TypeScript and Rust checks
    expect(preCommit).toContain('TypeScript');
    expect(preCommit).toContain('Rust');
    expect(prePush).toContain('npm run build');
    expect(prePush).toContain('cargo build');
  });

  it('generates generic hooks for unsupported languages', async () => {
    const unsupportedLanguage: LanguageDetection = {
      language: 'sql' as any, // SQL not in LANGUAGE_HOOK_MAP
      confidence: 1,
      indicators: ['schema.sql'],
    };

    await installGitHooks({ cwd: tempDir, languages: [unsupportedLanguage] });

    const preCommit = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    const prePush = await fs.readFile(path.join(hooksDir, 'pre-push'), 'utf-8');

    // Should have generic fallback
    expect(preCommit).toContain('generic');
    expect(prePush).toContain('generic');
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

  it('generates hooks with proper shebang', async () => {
    await installGitHooks({ cwd: tempDir, languages: [tsLanguage] });

    const preCommit = await fs.readFile(path.join(hooksDir, 'pre-commit'), 'utf-8');
    const prePush = await fs.readFile(path.join(hooksDir, 'pre-push'), 'utf-8');

    expect(preCommit).toMatch(/^#!\/bin\/sh\n/);
    expect(prePush).toMatch(/^#!\/bin\/sh\n/);
  });
});
