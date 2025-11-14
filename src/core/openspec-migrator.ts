import { existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileExists, readFile, writeFile } from '../utils/file-system.js';
import { createTaskManager } from './task-manager.js';

const OPENSPEC_DIR = 'openspec';
const CHANGES_DIR = 'changes';
const SPECS_DIR = 'specs';
const TASKS_FILE = 'tasks.md';
const PROPOSAL_FILE = 'proposal.md';
const DESIGN_FILE = 'design.md';

export interface MigrationResult {
  migrated: number;
  skipped: number;
  errors: string[];
  migratedTasks: string[];
}

/**
 * Migrate OpenSpec tasks to Rulebook format
 */
export async function migrateOpenSpecToRulebook(
  projectRoot: string,
  rulebookDir: string = 'rulebook'
): Promise<MigrationResult> {
  const result: MigrationResult = {
    migrated: 0,
    skipped: 0,
    errors: [],
    migratedTasks: [],
  };

  const openspecPath = join(projectRoot, OPENSPEC_DIR);
  const changesPath = join(openspecPath, CHANGES_DIR);

  // Check if OpenSpec directory exists
  if (!existsSync(changesPath)) {
    return result; // No OpenSpec tasks to migrate
  }

  // Get all change directories
  let changeDirs: string[] = [];
  try {
    changeDirs = readdirSync(changesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  } catch (error: any) {
    result.errors.push(`Failed to read OpenSpec changes directory: ${error.message}`);
    return result;
  }

  if (changeDirs.length === 0) {
    return result; // No tasks to migrate
  }

  // Initialize TaskManager
  const taskManager = createTaskManager(projectRoot, rulebookDir);
  await taskManager.initialize();

  // Migrate each task
  for (const changeDir of changeDirs) {
    const taskId = changeDir; // Use directory name as task ID
    const sourceTaskPath = join(changesPath, changeDir);
    const targetTaskPath = join(projectRoot, rulebookDir, 'tasks', taskId);

    try {
      // Check if task already exists in Rulebook
      if (existsSync(targetTaskPath)) {
        result.skipped++;
        continue;
      }

      // Create target directory
      mkdirSync(targetTaskPath, { recursive: true });
      mkdirSync(join(targetTaskPath, SPECS_DIR), { recursive: true });

      // Migrate proposal.md
      const proposalSource = join(sourceTaskPath, PROPOSAL_FILE);
      if (await fileExists(proposalSource)) {
        const proposalContent = await readFile(proposalSource);
        await writeFile(join(targetTaskPath, PROPOSAL_FILE), proposalContent);
      }

      // Migrate tasks.md
      const tasksSource = join(sourceTaskPath, TASKS_FILE);
      if (await fileExists(tasksSource)) {
        const tasksContent = await readFile(tasksSource);
        await writeFile(join(targetTaskPath, TASKS_FILE), tasksContent);
      }

      // Migrate design.md (if exists)
      const designSource = join(sourceTaskPath, DESIGN_FILE);
      if (await fileExists(designSource)) {
        const designContent = await readFile(designSource);
        await writeFile(join(targetTaskPath, DESIGN_FILE), designContent);
      }

      // Migrate specs
      const specsSource = join(sourceTaskPath, SPECS_DIR);
      if (existsSync(specsSource)) {
        const specDirs = readdirSync(specsSource, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        for (const specDir of specDirs) {
          const specSource = join(specsSource, specDir, 'spec.md');
          if (await fileExists(specSource)) {
            const specContent = await readFile(specSource);
            const targetSpecDir = join(targetTaskPath, SPECS_DIR, specDir);
            mkdirSync(targetSpecDir, { recursive: true });
            await writeFile(join(targetSpecDir, 'spec.md'), specContent);
          }
        }
      }

      result.migrated++;
      result.migratedTasks.push(taskId);
    } catch (error: any) {
      result.errors.push(`Failed to migrate task ${taskId}: ${error.message}`);
      result.skipped++;
    }
  }

  return result;
}

/**
 * Remove /rulebook/OPENSPEC.md if it exists
 */
export async function removeOpenSpecRulebookFile(
  projectRoot: string,
  rulebookDir: string = 'rulebook'
): Promise<boolean> {
  const openspecRulebookPath = join(projectRoot, rulebookDir, 'OPENSPEC.md');
  if (await fileExists(openspecRulebookPath)) {
    const { unlink } = await import('fs/promises');
    await unlink(openspecRulebookPath);
    return true;
  }
  return false;
}

/**
 * Archive OpenSpec directory (move to archive)
 */
export async function archiveOpenSpecDirectory(projectRoot: string): Promise<boolean> {
  const openspecPath = join(projectRoot, OPENSPEC_DIR);
  if (!existsSync(openspecPath)) {
    return false;
  }

  const archiveDate = new Date().toISOString().split('T')[0];
  const archivePath = join(projectRoot, `openspec-archive-${archiveDate}`);

  try {
    // Use mv command to move directory
    const { execSync } = await import('child_process');
    execSync(`mv "${openspecPath}" "${archivePath}"`, { cwd: projectRoot });
    return true;
  } catch {
    // Fallback: copy and remove
    const { cpSync, rmSync } = await import('fs');
    try {
      cpSync(openspecPath, archivePath, { recursive: true });
      rmSync(openspecPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
}
