import path from 'path';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { Logger } from './logger.js';
import { PRDTask, RalphPRD } from '../types.js';

/**
 * Converts rulebook tasks to Ralph-compatible PRD JSON format
 */
export class PRDGenerator {
  private projectRoot: string;
  private tasksDir: string;
  private logger: Logger;

  constructor(projectRoot: string, logger: Logger, tasksDir: string = 'rulebook/tasks') {
    this.projectRoot = projectRoot;
    this.tasksDir = path.join(projectRoot, tasksDir);
    this.logger = logger;
  }

  /**
   * Generate PRD from rulebook tasks
   */
  async generatePRD(
    projectName: string,
    languages: string[] = [],
    frameworks: string[] = []
  ): Promise<RalphPRD> {
    this.logger.info('Generating PRD from rulebook tasks...');

    const tasks = await this.loadTasksFromDisk();
    // Map returns Promise[] so we need Promise.all
    const prdTasksPromises = tasks.map((task, index) =>
      this.convertTaskToPRD(task, index + 1)
    );
    const prdTasks = await Promise.all(prdTasksPromises);

    const prd: RalphPRD = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      project_name: projectName,
      total_tasks: prdTasks.length,
      tasks: prdTasks,
      metadata: {
        coverage_threshold: 95,
        languages,
        frameworks,
        git_origin: await this.getGitOrigin(),
      },
    };

    this.logger.info(`Generated PRD with ${prdTasks.length} tasks`);
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
   * Convert a rulebook task to PRD task format
   * Uses the full rulebook task structure: proposal.md + tasks.md + specs/
   */
  private async convertTaskToPRD(task: any, priority: number): Promise<PRDTask> {
    const title = this.extractTitle(task.proposal);
    const description = this.extractDescription(task.proposal);
    const tasksChecklist = await this.loadTasksChecklist(task.path);

    return {
      id: task.id,
      title: title || task.id,
      description: description || 'Task extracted from rulebook proposal',
      status: 'pending',
      priority,
      // Use actual tasks from tasks.md as acceptance criteria
      acceptance_criteria:
        tasksChecklist.length > 0 ? tasksChecklist.slice(0, 10) : ['Implementation complete'],
      estimated_iterations: this.estimateIterations(description),
      dependencies: [],
      tags: this.extractTags(task.id),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
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


  /**
   * Extract tags from task ID
   */
  private extractTags(taskId: string): string[] {
    // Convert task ID parts to tags
    // e.g., "integrate-ralph-autonomous-loop" -> ["ralph", "autonomous", "loop"]
    return taskId
      .split('-')
      .filter((part) => part.length > 2)
      .slice(0, 5);
  }

  /**
   * Estimate number of iterations needed
   */
  private estimateIterations(description: string): number {
    // Simple heuristic based on description length and keywords
    const length = description.length;
    const complexityKeywords = [
      'complex',
      'architecture',
      'integration',
      'refactor',
      'testing',
    ];
    const hasComplexKeywords = complexityKeywords.some((kw) =>
      description.toLowerCase().includes(kw)
    );

    let iterations = 1;
    if (length > 500) iterations++;
    if (length > 1000) iterations++;
    if (hasComplexKeywords) iterations++;

    return Math.min(iterations, 5); // Cap at 5 iterations
  }

  /**
   * Get git remote origin URL
   */
  private async getGitOrigin(): Promise<string | undefined> {
    try {
      // Try to read .git/config directly to avoid process spawning issues
      const gitConfigPath = path.join(this.projectRoot, '.git', 'config');
      if (!existsSync(gitConfigPath)) {
        return undefined;
      }

      const content = await readFile(gitConfigPath, 'utf-8');
      const match = content.match(/url\s*=\s*(.+)/);
      return match ? match[1].trim() : undefined;
    } catch {
      return undefined;
    }
  }
}
