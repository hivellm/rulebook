import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { copyFile, ensureDir } from '../utils/file-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolve templates/ralph directory (handles both dev and production). */
function getRalphTemplatesDir(): string {
  return path.join(__dirname, '..', '..', 'templates', 'ralph');
}

const RALPH_SCRIPTS = [
  'ralph-init',
  'ralph-run',
  'ralph-status',
  'ralph-pause',
  'ralph-history',
] as const;

const SCRIPT_EXTENSIONS = ['.sh', '.bat'] as const;

/**
 * Install Ralph shell scripts into the project's `.rulebook/scripts/` directory.
 *
 * Copies `.sh` and `.bat` script pairs from the templates directory.
 * Sets executable permissions (0o755) on `.sh` files on non-Windows platforms.
 * Idempotent: overwrites existing scripts without error.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns List of installed file paths (relative to projectRoot).
 */
export async function installRalphScripts(projectRoot: string): Promise<string[]> {
  const templatesDir = getRalphTemplatesDir();
  const scriptsDir = path.join(projectRoot, '.rulebook', 'scripts');

  await ensureDir(scriptsDir);

  const installed: string[] = [];

  for (const scriptName of RALPH_SCRIPTS) {
    for (const ext of SCRIPT_EXTENSIONS) {
      const filename = `${scriptName}${ext}`;
      const source = path.join(templatesDir, filename);
      const destination = path.join(scriptsDir, filename);

      await copyFile(source, destination);

      // Set executable permissions on .sh files (Unix/macOS only)
      if (ext === '.sh' && process.platform !== 'win32') {
        await fs.chmod(destination, 0o755);
      }

      installed.push(path.join('.rulebook', 'scripts', filename));
    }
  }

  return installed;
}
