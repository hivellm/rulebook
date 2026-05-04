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

/**
 * Normalize CRLF/CR line endings to LF.
 *
 * Shell scripts written by `rulebook init` MUST have LF endings. On macOS/Linux,
 * bash interprets a trailing `\r` as part of the command and breaks every line
 * (`set -\r u` fails, `function() {\r` fails to parse). A single template file
 * authored on Windows without honoring `.gitattributes` poisons the entire init
 * output. Normalize defensively at the write boundary.
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Write a shell script to disk with LF line endings and (on POSIX) `0o755` mode.
 *
 * Use this for `.sh` / `.bash` files instead of `writeFile` or `copyFile`.
 * Accepts either a string (already-loaded template content) or a source path
 * (the file is read, normalized, and re-written).
 */
export async function writeShellScript(
  destination: string,
  contentOrSourcePath: { content: string } | { sourcePath: string }
): Promise<void> {
  const dir = path.dirname(destination);
  await fs.mkdir(dir, { recursive: true });

  const raw =
    'content' in contentOrSourcePath
      ? contentOrSourcePath.content
      : await fs.readFile(contentOrSourcePath.sourcePath, 'utf-8');

  const normalized = normalizeLineEndings(raw);
  await fs.writeFile(destination, normalized, 'utf-8');

  if (process.platform !== 'win32') {
    await fs.chmod(destination, 0o755);
  }
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
