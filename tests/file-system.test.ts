import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  fileExists,
  readFile,
  writeFile,
  findFiles,
  createBackup,
  ensureDir,
  readJsonFile,
} from '../src/utils/file-system';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('file-system', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      const exists = await fileExists(filePath);

      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      const exists = await fileExists(filePath);

      expect(exists).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'test content';
      await fs.writeFile(filePath, content);

      const result = await readFile(filePath);

      expect(result).toBe(content);
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'test content';

      await writeFile(filePath, content);

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should create directory if not exists', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'test.txt');
      const content = 'test content';

      await writeFile(filePath, content);

      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });
  });

  describe('findFiles', () => {
    it('should find files matching pattern', async () => {
      await fs.writeFile(path.join(testDir, 'test1.rs'), '');
      await fs.writeFile(path.join(testDir, 'test2.rs'), '');
      await fs.writeFile(path.join(testDir, 'test.txt'), '');

      const files = await findFiles('**/*.rs', testDir);

      expect(files).toHaveLength(2);
      expect(files.some((f) => f.endsWith('test1.rs'))).toBe(true);
      expect(files.some((f) => f.endsWith('test2.rs'))).toBe(true);
    });

    it('should ignore node_modules', async () => {
      await fs.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'node_modules', 'test.rs'), '');
      await fs.writeFile(path.join(testDir, 'test.rs'), '');

      const files = await findFiles('**/*.rs', testDir);

      expect(files).toHaveLength(1);
      expect(files[0].endsWith('test.rs')).toBe(true);
      expect(files[0]).not.toContain('node_modules');
    });
  });

  describe('createBackup', () => {
    it('should create backup file with timestamp', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'original content';
      await fs.writeFile(filePath, content);

      const backupPath = await createBackup(filePath);

      expect(await fileExists(backupPath)).toBe(true);
      expect(backupPath).toContain('.backup-');
      const backupContent = await readFile(backupPath);
      expect(backupContent).toBe(content);
    });
  });

  describe('ensureDir', () => {
    it('should create directory', async () => {
      const dirPath = path.join(testDir, 'nested', 'dir');

      await ensureDir(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existing');
      await fs.mkdir(dirPath);

      await expect(ensureDir(dirPath)).resolves.not.toThrow();
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file', async () => {
      const filePath = path.join(testDir, 'test.json');
      const data = { name: 'test', value: 42 };
      await fs.writeFile(filePath, JSON.stringify(data));

      const result = await readJsonFile(filePath);

      expect(result).toEqual(data);
    });

    it('should return null for non-existent file', async () => {
      const filePath = path.join(testDir, 'nonexistent.json');

      const result = await readJsonFile(filePath);

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      await fs.writeFile(filePath, 'not json');

      const result = await readJsonFile(filePath);

      expect(result).toBeNull();
    });
  });
});

