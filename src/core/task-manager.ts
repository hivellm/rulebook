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
    this.archivePath = join(this.tasksPath, ARCHIVE_DIR);
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
  }

  /**
   * Get the path to a task directory
   */
  getTaskPath(taskId: string): string {
    return join(this.tasksPath, taskId);
  }

  /**
   * Create a new task
   */
  async createTask(taskId: string): Promise<void> {
    await this.initialize();

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
   * Validate task format (OpenSpec-compatible)
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

    // TODO: Apply spec deltas to main specifications
    // This would require parsing the spec deltas and merging them into /rulebook/specs/
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
  }
}

export function createTaskManager(
  projectRoot: string,
  rulebookDir: string = '.rulebook'
): TaskManager {
  return new TaskManager(projectRoot, rulebookDir);
}
