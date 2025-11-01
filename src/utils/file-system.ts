import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function copyFile(source: string, destination: string): Promise<void> {
  const dir = path.dirname(destination);
  await fs.mkdir(dir, { recursive: true });
  await fs.copyFile(source, destination);
}

export async function findFiles(pattern: string, cwd: string = process.cwd()): Promise<string[]> {
  return await glob(pattern, {
    cwd,
    absolute: true,
    ignore: ['node_modules/**', 'target/**', 'dist/**', '.git/**'],
  });
}

export async function createBackup(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup-${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
