import { writeFile as fsWriteFile, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import {
  fileExists,
  readFile as readFileUtil,
  writeFile as writeFileUtil,
} from '../utils/file-system.js';

const writeFileAsync = promisify(fsWriteFile);

const TASKS_DIR = 'tasks';
const ARCHIVE_DIR = 'archive';
const SPECS_DIR = 'specs';
const README_FILE = 'README.md';

/**
 * Regex for phase-based task naming: phase<number>[subletter]_<version>-<description>
 * Examples: phase0_3.1.0-volumetric-clouds, phase3a_3.24.0-lens-flare
 */
const PHASE_PREFIX_REGEX = /^phase\d+[a-z]?_/;

export interface RulebookTask {
  id: string;
  title: string;
  proposal?: string;
  tasks?: string;
  design?: string;
  specs?: Record<string, string>; // module -> spec content
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class TaskManager {
  private rulebookPath: string;
  private tasksPath: string;
  private archivePath: string;

  constructor(projectRoot: string, rulebookDir: string = '.rulebook') {
    this.rulebookPath = join(projectRoot, rulebookDir);
    this.tasksPath = join(this.rulebookPath, TASKS_DIR);
    this.archivePath = join(this.rulebookPath, ARCHIVE_DIR);
  }

  /**
   * Initialize Rulebook tasks directory structure
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.rulebookPath)) {
      mkdirSync(this.rulebookPath, { recursive: true });
    }
    if (!existsSync(this.tasksPath)) {
      mkdirSync(this.tasksPath, { recursive: true });
    }
    if (!existsSync(this.archivePath)) {
      mkdirSync(this.archivePath, { recursive: true });
    }
    // Auto-migrate legacy archive from tasks/archive to .rulebook/archive
    await this.migrateArchive();
  }

  /**
   * Get the path to a task directory
   */
  getTaskPath(taskId: string): string {
    return join(this.tasksPath, taskId);
  }

  /**
   * Validate task ID follows phase naming convention: phase<x>_<description>
   */
  validateTaskId(taskId: string): { valid: boolean; error?: string } {
    if (!PHASE_PREFIX_REGEX.test(taskId)) {
      return {
        valid: false,
        error: `Task ID "${taskId}" must start with a phase prefix (e.g., phase0_, phase1_, phase2a_). Example: phase1_add-user-auth`,
      };
    }
    return { valid: true };
  }

  /**
   * Extract phase number from task ID for sorting
   */
  extractPhase(taskId: string): { phase: number; subletter: string } {
    const match = taskId.match(/^phase(\d+)([a-z])?_/);
    if (!match) return { phase: Infinity, subletter: '' };
    return { phase: parseInt(match[1], 10), subletter: match[2] || '' };
  }

  /**
   * Create a new task
   */
  async createTask(taskId: string): Promise<void> {
    await this.initialize();

    // Validate phase naming convention
    const nameValidation = this.validateTaskId(taskId);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const taskPath = join(this.tasksPath, taskId);
    if (existsSync(taskPath)) {
      throw new Error(`Task ${taskId} already exists`);
    }

    mkdirSync(taskPath, { recursive: true });
    mkdirSync(join(taskPath, SPECS_DIR), { recursive: true });

    // Create proposal.md template
    const proposalContent = `# Proposal: ${taskId}

## Why
[Explain why this change is needed - minimum 20 characters]

## What Changes
[Describe what will change]

## Impact
- Affected specs: [list]
- Affected code: [list]
- Breaking change: YES/NO
- User benefit: [describe]
`;

    await writeFileAsync(join(taskPath, 'proposal.md'), proposalContent);

    // Create tasks.md template
    const tasksContent = `## 1. Implementation
- [ ] 1.1 First task
- [ ] 1.2 Second task

## 2. Testing
- [ ] 2.1 Write tests
- [ ] 2.2 Verify coverage

## 3. Documentation
- [ ] 3.1 Update README
- [ ] 3.2 Update CHANGELOG
`;

    await writeFileAsync(join(taskPath, 'tasks.md'), tasksContent);

    // Create .metadata.json with initial status
    const now = new Date().toISOString();
    const metadata = {
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    };
    await writeFileAsync(join(taskPath, '.metadata.json'), JSON.stringify(metadata, null, 2));

    // Update tasks README index
    await this.updateReadme();
  }

  /**
   * Generate and update README.md index in the tasks root directory.
   * Groups tasks by phase and shows status, description, and progress.
   */
  async updateReadme(): Promise<void> {
    const tasks = await this.listTasks(false);

    // Sort tasks by phase, then by subletter, then alphabetically
    tasks.sort((a, b) => {
      const phaseA = this.extractPhase(a.id);
      const phaseB = this.extractPhase(b.id);
      if (phaseA.phase !== phaseB.phase) return phaseA.phase - phaseB.phase;
      if (phaseA.subletter !== phaseB.subletter) return phaseA.subletter.localeCompare(phaseB.subletter);
      return a.id.localeCompare(b.id);
    });

    // Group by phase
    const phases = new Map<string, RulebookTask[]>();
    for (const task of tasks) {
      const match = task.id.match(/^(phase\d+[a-z]?)_/);
      const phaseKey = match ? match[1] : 'unphased';
      if (!phases.has(phaseKey)) phases.set(phaseKey, []);
      phases.get(phaseKey)!.push(task);
    }

    // Calculate progress for each task from tasks.md checklist
    const getProgress = (task: RulebookTask): { done: number; total: number } => {
      if (!task.tasks) return { done: 0, total: 0 };
      const checked = (task.tasks.match(/- \[x\]/gi) || []).length;
      const unchecked = (task.tasks.match(/- \[ \]/g) || []).length;
      return { done: checked, total: checked + unchecked };
    };

    const statusIcon = (status: string): string => {
      switch (status) {
        case 'completed': return '✅';
        case 'in-progress': return '🔄';
        case 'blocked': return '🚫';
        default: return '⬚';
      }
    };

    let readme = `# Tasks Index\n\n`;
    readme += `> Auto-generated by rulebook. Do not edit manually.\n\n`;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    readme += `**Total**: ${totalTasks} tasks | **Completed**: ${completedTasks} | **In Progress**: ${inProgressTasks} | **Pending**: ${totalTasks - completedTasks - inProgressTasks}\n\n`;

    for (const [phaseKey, phaseTasks] of phases) {
      readme += `## ${phaseKey}\n\n`;
      readme += `| Status | Task | Progress | Description |\n`;
      readme += `|--------|------|----------|-------------|\n`;

      for (const task of phaseTasks) {
        const progress = getProgress(task);
        const progressStr = progress.total > 0
          ? `${progress.done}/${progress.total}`
          : '-';
        // Extract short description from task ID (after phase prefix)
        const desc = task.id.replace(/^phase\d+[a-z]?_/, '').replace(/-/g, ' ');
        readme += `| ${statusIcon(task.status)} | ${task.id} | ${progressStr} | ${desc} |\n`;
      }
      readme += `\n`;
    }

    await writeFileUtil(join(this.tasksPath, README_FILE), readme);
  }

  /**
   * Migrate archive directory from legacy location (tasks/archive) to new location (.rulebook/archive)
   */
  async migrateArchive(): Promise<boolean> {
    const legacyArchivePath = join(this.tasksPath, ARCHIVE_DIR);
    if (!existsSync(legacyArchivePath) || !statSync(legacyArchivePath).isDirectory()) {
      return false;
    }

    // Already migrated — new archive path exists and legacy also exists
    if (!existsSync(this.archivePath)) {
      mkdirSync(this.archivePath, { recursive: true });
    }

    // Move each archived task from legacy to new location
    const entries = readdirSync(legacyArchivePath, { withFileTypes: true });
    const { renameSync } = await import('fs');
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const src = join(legacyArchivePath, entry.name);
        const dest = join(this.archivePath, entry.name);
        if (!existsSync(dest)) {
          renameSync(src, dest);
        }
      }
    }

    // Remove legacy archive directory if empty
    const remaining = readdirSync(legacyArchivePath);
    if (remaining.length === 0) {
      const { rmdirSync } = await import('fs');
      rmdirSync(legacyArchivePath);
    }

    return true;
  }

  /**
   * List all tasks
   */
  async listTasks(includeArchived: boolean = false): Promise<RulebookTask[]> {
    await this.initialize();

    const tasks: RulebookTask[] = [];

    // List active tasks
    if (existsSync(this.tasksPath)) {
      const entries = readdirSync(this.tasksPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== ARCHIVE_DIR) {
          const task = await this.loadTask(entry.name);
          if (task) {
            tasks.push(task);
          }
        }
      }
    }

    // List archived tasks if requested
    if (includeArchived && existsSync(this.archivePath)) {
      const archiveEntries = readdirSync(this.archivePath, { withFileTypes: true });
      for (const entry of archiveEntries) {
        if (entry.isDirectory()) {
          const task = await this.loadTask(entry.name, true);
          if (task) {
            // Extract date from archive name (YYYY-MM-DD-task-id format)
            const dateMatch = entry.name.match(/^(\d{4}-\d{2}-\d{2})-/);
            if (dateMatch) {
              task.archivedAt = dateMatch[1];
            } else {
              task.archivedAt = new Date().toISOString().split('T')[0];
            }
            tasks.push(task);
          }
        }
      }
    }

    return tasks;
  }

  /**
   * Load a task by ID
   */
  async loadTask(taskId: string, archived: boolean = false): Promise<RulebookTask | null> {
    const basePath = archived ? this.archivePath : this.tasksPath;
    const taskPath = join(basePath, taskId);

    if (!existsSync(taskPath)) {
      return null;
    }

    const proposalPath = join(taskPath, 'proposal.md');
    const tasksPath = join(taskPath, 'tasks.md');
    const designPath = join(taskPath, 'design.md');
    const specsPath = join(taskPath, SPECS_DIR);
    const metadataPath = join(taskPath, '.metadata.json');

    // Extract original task ID from archive name if archived (YYYY-MM-DD-task-id format)
    let originalTaskId = taskId;
    if (archived) {
      const dateMatch = taskId.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
      if (dateMatch) {
        originalTaskId = dateMatch[2];
      }
    }

    const task: RulebookTask = {
      id: originalTaskId,
      title: originalTaskId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      specs: {},
    };

    // Load metadata (status, dates, etc.)
    if (await fileExists(metadataPath)) {
      try {
        const metadata = JSON.parse(await readFileUtil(metadataPath));
        if (metadata.status) task.status = metadata.status;
        if (metadata.createdAt) task.createdAt = metadata.createdAt;
        if (metadata.updatedAt) task.updatedAt = metadata.updatedAt;
      } catch {
        // Ignore invalid metadata
      }
    }

    // Load proposal
    if (await fileExists(proposalPath)) {
      task.proposal = await readFileUtil(proposalPath);
    }

    // Load tasks
    if (await fileExists(tasksPath)) {
      task.tasks = await readFileUtil(tasksPath);
    }

    // Load design
    if (await fileExists(designPath)) {
      task.design = await readFileUtil(designPath);
    }

    // Load specs
    if (existsSync(specsPath)) {
      const specEntries = readdirSync(specsPath, { withFileTypes: true });
      for (const specEntry of specEntries) {
        if (specEntry.isDirectory()) {
          const specFile = join(specsPath, specEntry.name, 'spec.md');
          if (await fileExists(specFile)) {
            task.specs![specEntry.name] = await readFileUtil(specFile);
          }
        }
      }
    }

    // Fallback to file stats for dates if metadata doesn't exist
    if (!(await fileExists(metadataPath))) {
      try {
        const stats = statSync(taskPath);
        task.createdAt = stats.birthtime.toISOString();
        task.updatedAt = stats.mtime.toISOString();
      } catch {
        // Use defaults if stats fail
      }
    }

    return task;
  }

  /**
   * Validate task format
   */
  async validateTask(taskId: string): Promise<TaskValidationResult> {
    const task = await this.loadTask(taskId);
    if (!task) {
      return {
        valid: false,
        errors: [`Task ${taskId} not found`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate proposal
    if (!task.proposal) {
      errors.push('Missing proposal.md');
    } else {
      // Check Purpose section (minimum 20 characters)
      const purposeMatch = task.proposal.match(/## Why\s*\n([\s\S]*?)(?=\n##|$)/);
      if (!purposeMatch || purposeMatch[1].trim().length < 20) {
        errors.push('Purpose section (## Why) must have at least 20 characters');
      }
    }

    // Validate specs
    if (!task.specs || Object.keys(task.specs).length === 0) {
      warnings.push('No spec files found (specs/*/spec.md)');
    } else {
      for (const [module, specContent] of Object.entries(task.specs)) {
        // Check for requirements with SHALL/MUST
        const requirementMatches = specContent.match(/### Requirement:.*/g) || [];
        for (const req of requirementMatches) {
          const reqText = specContent.substring(specContent.indexOf(req));
          const reqBody = reqText.split('\n').slice(1).join('\n').split('####')[0];
          if (!reqBody.match(/\b(SHALL|MUST)\b/i)) {
            errors.push(`Requirement in ${module}/spec.md missing SHALL or MUST keyword: ${req}`);
          }
        }

        // Check for scenarios with 4 hashtags (not 3)
        // Only check at start of line (not in text content)
        const scenario3Matches = specContent.match(/^### Scenario:/gm) || [];
        if (scenario3Matches.length > 0) {
          errors.push(`Scenarios in ${module}/spec.md must use 4 hashtags (####), not 3 (###)`);
        }

        // Check for Given/When/Then structure
        const scenarios = specContent.match(/#### Scenario:[\s\S]*?(?=####|##|$)/g) || [];
        for (const scenario of scenarios) {
          const hasGiven = /Given/i.test(scenario);
          const hasWhen = /When/i.test(scenario);
          const hasThen = /Then/i.test(scenario);
          if (!hasGiven || !hasWhen || !hasThen) {
            warnings.push(`Scenario in ${module}/spec.md should use Given/When/Then structure`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Archive a completed task
   */
  async archiveTask(taskId: string, skipValidation: boolean = false): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Validate before archiving (unless skipped)
    if (!skipValidation) {
      const validation = await this.validateTask(taskId);
      if (!validation.valid) {
        throw new Error(`Task validation failed:\n${validation.errors.join('\n')}`);
      }
    }

    const taskPath = join(this.tasksPath, taskId);
    const archiveDate = new Date().toISOString().split('T')[0];
    const archiveName = `${archiveDate}-${taskId}`;
    const archiveTaskPath = join(this.archivePath, archiveName);

    // Ensure archive directory exists
    if (!existsSync(this.archivePath)) {
      mkdirSync(this.archivePath, { recursive: true });
    }

    if (existsSync(archiveTaskPath)) {
      throw new Error(`Archive ${archiveName} already exists`);
    }

    // Move task to archive using cross-platform filesystem operations
    const { renameSync } = await import('fs');
    renameSync(taskPath, archiveTaskPath);

    // Update tasks README index
    await this.updateReadme();
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: RulebookTask['status']): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();

    // Persist status to .metadata.json
    const taskPath = join(this.tasksPath, taskId);
    const metadataPath = join(taskPath, '.metadata.json');

    const metadata = {
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    await writeFileUtil(metadataPath, JSON.stringify(metadata, null, 2));

    // Update tasks README index
    await this.updateReadme();
  }

  /**
   * Get raw task metadata (including blocks/blockedBy/cascadeImpact for v5 blocker tracking)
   */
  async getTaskMetadata(taskId: string): Promise<Record<string, unknown> | null> {
    const taskPath = join(this.tasksPath, taskId);
    const metadataPath = join(taskPath, '.metadata.json');
    if (!(await fileExists(metadataPath))) return null;
    try {
      return JSON.parse(await readFileUtil(metadataPath));
    } catch {
      return null;
    }
  }

  /**
   * Show task details
   */
  async showTask(taskId: string): Promise<RulebookTask | null> {
    // Try active tasks first
    let task = await this.loadTask(taskId, false);
    if (task) {
      return task;
    }

    // Try archived tasks
    task = await this.loadTask(taskId, true);
    if (task) {
      task.archivedAt = taskId.split('-').slice(0, 3).join('-'); // Extract date from task ID
      return task;
    }

    return null;
  }

  /**
   * Delete a task permanently
   */
  async deleteTask(taskId: string): Promise<void> {
    const taskPath = join(this.tasksPath, taskId);

    if (!existsSync(taskPath)) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Remove task directory recursively
    const { rmSync } = await import('fs');
    rmSync(taskPath, { recursive: true, force: true });

    // Update tasks README index
    await this.updateReadme();
  }
}

export function createTaskManager(
  projectRoot: string,
  rulebookDir: string = '.rulebook'
): TaskManager {
  return new TaskManager(projectRoot, rulebookDir);
}
