import path from 'path';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { Logger } from './logger.js';
import { PRDUserStory, RalphPRD } from '../types.js';

/**
 * Converts rulebook tasks to Ralph-compatible PRD JSON format
 */
export class PRDGenerator {
  private tasksDir: string;
  private logger: Logger;

  constructor(projectRoot: string, logger: Logger, tasksDir: string = '.rulebook/tasks') {
    this.tasksDir = path.join(projectRoot, tasksDir);
    this.logger = logger;
  }

  /**
   * Generate PRD from rulebook tasks
   */
  async generatePRD(projectName: string): Promise<RalphPRD> {
    this.logger.info('Generating PRD from rulebook tasks...');

    const tasks = await this.loadTasksFromDisk();
    // Map returns Promise[] so we need Promise.all
    const userStoriesPromises = tasks.map((task, index) =>
      this.convertTaskToUserStory(task, index + 1)
    );
    const userStories = await Promise.all(userStoriesPromises);

    // Generate branch name from project name
    const branchName = `ralph/${projectName.toLowerCase().replace(/\s+/g, '-')}`;

    const prd: RalphPRD = {
      project: projectName,
      branchName,
      description: `Ralph autonomous loop for ${projectName} - ${userStories.length} user stories`,
      userStories,
    };

    this.logger.info(`Generated PRD with ${userStories.length} user stories`);
    return prd;
  }

  /**
   * Load tasks from rulebook/tasks directory
   */
  private async loadTasksFromDisk(): Promise<any[]> {
    if (!existsSync(this.tasksDir)) {
      this.logger.warn(`Tasks directory not found: ${this.tasksDir}`);
      return [];
    }

    const tasks: any[] = [];
    const entries = await readdir(this.tasksDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      // Skip archive directory
      if (entry.name === 'archive') {
        continue;
      }

      const taskPath = path.join(this.tasksDir, entry.name);
      const proposalPath = path.join(taskPath, 'proposal.md');

      // Read proposal.md to extract task info
      if (existsSync(proposalPath)) {
        try {
          const proposal = await readFile(proposalPath, 'utf-8');
          const task = {
            id: entry.name,
            path: taskPath,
            proposal,
          };
          tasks.push(task);
        } catch (err) {
          this.logger.warn(`Failed to read task ${entry.name}: ${err}`);
        }
      }
    }

    return tasks;
  }

  /**
   * Convert a rulebook task to Ralph user story format
   * Uses the full rulebook task structure: proposal.md + tasks.md + specs/
   */
  private async convertTaskToUserStory(task: any, priority: number): Promise<PRDUserStory> {
    const title = this.extractTitle(task.proposal);
    const description = this.extractDescription(task.proposal);
    const tasksChecklist = await this.loadTasksChecklist(task.path);
    const specCriteria = await this.loadSpecCriteria(task.path);

    // Merge checklist items with SHALL/MUST requirements from specs
    const allCriteria = [...tasksChecklist, ...specCriteria];

    // Build notes: include spec file references for traceability
    const specSources = await this.listSpecFiles(task.path);
    const notes = specSources.length > 0 ? `Spec files: ${specSources.join(', ')}` : '';

    return {
      id: `US-${String(priority).padStart(3, '0')}`,
      title: title || task.id,
      description: description || 'Task extracted from rulebook proposal',
      acceptanceCriteria:
        allCriteria.length > 0 ? allCriteria.slice(0, 15) : ['Implementation complete'],
      priority,
      passes: false,
      notes,
      sourceTaskId: task.id,
    };
  }

  /**
   * Load SHALL/MUST requirements from specs/*.md files as acceptance criteria.
   */
  private async loadSpecCriteria(taskPath: string): Promise<string[]> {
    const specsDir = path.join(taskPath, 'specs');
    if (!existsSync(specsDir)) {
      return [];
    }

    const criteria: string[] = [];

    try {
      const entries = await readdir(specsDir, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(specsDir, entry.name);

        if (entry.isDirectory()) {
          // Recurse one level: specs/<module>/spec.md
          const subEntries = await readdir(entryPath, { withFileTypes: true });
          for (const sub of subEntries) {
            if (sub.isFile() && sub.name.endsWith('.md')) {
              const content = await readFile(path.join(entryPath, sub.name), 'utf-8');
              this.extractShallMust(content, criteria);
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = await readFile(entryPath, 'utf-8');
          this.extractShallMust(content, criteria);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to read spec files for task at ${taskPath}: ${err}`);
    }

    return criteria;
  }

  /**
   * Extract SHALL/MUST statements from spec content as acceptance criteria.
   */
  private extractShallMust(content: string, criteria: string[]): void {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Match lines with SHALL or MUST (requirement language)
      if (/\b(SHALL|MUST)\b/.test(trimmed) && trimmed.length > 10 && trimmed.length < 300) {
        // Clean up markdown: remove leading dashes, asterisks, backtick code
        const cleaned = trimmed.replace(/^[-*]\s+/, '').replace(/`[^`]+`/g, (m) => m.slice(1, -1));
        if (!criteria.includes(cleaned)) {
          criteria.push(cleaned);
        }
      }
    }
  }

  /**
   * List relative paths of spec files for notes/traceability.
   */
  private async listSpecFiles(taskPath: string): Promise<string[]> {
    const specsDir = path.join(taskPath, 'specs');
    if (!existsSync(specsDir)) {
      return [];
    }

    const files: string[] = [];
    try {
      const entries = await readdir(specsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subEntries = await readdir(path.join(specsDir, entry.name), {
            withFileTypes: true,
          });
          for (const sub of subEntries) {
            if (sub.isFile() && sub.name.endsWith('.md')) {
              files.push(`specs/${entry.name}/${sub.name}`);
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(`specs/${entry.name}`);
        }
      }
    } catch {
      // ignore
    }
    return files;
  }

  /**
   * Load tasks checklist from tasks.md
   */
  private async loadTasksChecklist(taskPath: string): Promise<string[]> {
    const tasksPath = path.join(taskPath, 'tasks.md');
    const tasks: string[] = [];

    if (!existsSync(tasksPath)) {
      return tasks;
    }

    try {
      const content = await readFile(tasksPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Match checkbox lines: "- [ ] Task description" or "- [x] Task description"
        const match = line.match(/^-\s+\[[^\]]\]\s+(.+)$/);
        if (match) {
          tasks.push(match[1].trim());
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to read tasks.md: ${err}`);
    }

    return tasks;
  }

  /**
   * Extract title from proposal markdown
   */
  private extractTitle(proposal: string): string {
    const titleMatch = proposal.match(/^#\s+(.+?)$/m);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  /**
   * Extract description from proposal markdown
   */
  private extractDescription(proposal: string): string {
    // Extract "What Changes" or first substantial paragraph
    // eslint-disable-next-line no-useless-escape
    const whatChangesMatch = proposal.match(/##\s+What Changes\n\n([\s\S]*?)(?=##|$)/);
    if (whatChangesMatch) {
      return whatChangesMatch[1].trim().substring(0, 500);
    }

    // Fall back to first paragraph
    const lines = proposal.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    return lines.slice(0, 3).join('\n').substring(0, 500);
  }
}
