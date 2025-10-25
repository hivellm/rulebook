import { readFile, existsSync, mkdirSync, readdirSync } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { OpenSpecData, OpenSpecTask } from '../types.js';

const readFileAsync = promisify(readFile);

const OPENSPEC_DIR = 'openspec';
const CHANGES_DIR = 'changes';
const SPECS_DIR = 'specs';
const TASKS_FILE = 'tasks.md';

export class OpenSpecManager {
  private openspecPath: string;
  private changesPath: string;
  private specsPath: string;
  private data: OpenSpecData | null = null;

  constructor(projectRoot: string) {
    this.openspecPath = join(projectRoot, OPENSPEC_DIR);
    this.changesPath = join(this.openspecPath, CHANGES_DIR);
    this.specsPath = join(this.openspecPath, SPECS_DIR);
  }

  /**
   * Initialize OpenSpec directory structure
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.openspecPath)) {
      mkdirSync(this.openspecPath, { recursive: true });
    }
    if (!existsSync(this.changesPath)) {
      mkdirSync(this.changesPath, { recursive: true });
    }
    if (!existsSync(this.specsPath)) {
      mkdirSync(this.specsPath, { recursive: true });
    }
  }

  /**
   * Load OpenSpec data from changes directory
   */
  async loadOpenSpec(): Promise<OpenSpecData> {
    if (this.data) {
      return this.data;
    }

    await this.initialize();

    try {
      // Load tasks from all changes
      const tasks = await this.loadTasksFromChanges();

      // Load current task from metadata
      let currentTask: string | undefined;

      // Load history from completed tasks
      const history: OpenSpecTask[] = tasks.filter(t => t.status === 'completed');

      this.data = {
        tasks: tasks.filter(t => t.status !== 'completed'),
        currentTask,
        history,
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalTasks: tasks.length,
          completedTasks: history.length
        }
      };

      return this.data;
    } catch (error) {
      throw new Error(`Failed to load OpenSpec data: ${error}`);
    }
  }

  /**
   * Save OpenSpec data (tasks are managed in changes, so this is mostly for metadata)
   */
  async saveOpenSpec(): Promise<void> {
    if (!this.data) {
      throw new Error('No data to save');
    }

    try {
      await this.initialize();

      // Update metadata
      this.data.metadata.updatedAt = new Date().toISOString();
      this.data.metadata.totalTasks = this.data.tasks.length + this.data.history.length;
      this.data.metadata.completedTasks = this.data.history.length;

      // Tasks are managed in individual change files, not in a central file
    } catch (error) {
      throw new Error(`Failed to save OpenSpec data: ${error}`);
    }
  }

  /**
   * Load tasks from all changes directories
   */
  private async loadTasksFromChanges(): Promise<OpenSpecTask[]> {
    const allTasks: OpenSpecTask[] = [];

    if (!existsSync(this.changesPath)) {
      return allTasks;
    }

    try {
      const changeDirs = readdirSync(this.changesPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const changeDir of changeDirs) {
        const tasksPath = join(this.changesPath, changeDir, TASKS_FILE);
        if (existsSync(tasksPath)) {
          const tasksContent = await readFileAsync(tasksPath, 'utf-8');
          const tasks = this.parseTasksFromMarkdown(tasksContent);
          allTasks.push(...tasks);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not load tasks from changes: ${error}`);
    }

    return allTasks;
  }

  /**
   * Parse tasks from markdown content
   */
  private parseTasksFromMarkdown(content: string): OpenSpecTask[] {
    const tasks: OpenSpecTask[] = [];
    const lines = content.split('\n');
    
    // TODO: Implement task parsing logic
    // let currentTask: Partial<OpenSpecTask> | null = null;
    // let inTaskSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for task list items
      if (line.startsWith('- [') && line.includes(']')) {
        const statusMatch = line.match(/^- \[([x ])\] (.+)$/);
        if (statusMatch) {
          const isCompleted = statusMatch[1] === 'x';
          const taskTitle = statusMatch[2];
          
          // Extract task ID from title if present, otherwise generate one
          const idMatch = taskTitle.match(/^(.+) \(id: (.+)\)$/);
          const title = idMatch ? idMatch[1] : taskTitle;
          const id = idMatch ? idMatch[2] : randomUUID();
          
          // Extract priority from title if present
          const priorityMatch = title.match(/^(\d+)\.\d+ (.+)$/);
          const priority = priorityMatch ? parseInt(priorityMatch[1]) : 1;
          const cleanTitle = priorityMatch ? priorityMatch[2] : title;
          
          // Extract dependencies from subsequent lines
          const dependencies: string[] = [];
          let j = i + 1;
          while (j < lines.length && lines[j].startsWith('  -')) {
            const depMatch = lines[j].match(/^- (.+) \(id: (.+)\)$/);
            if (depMatch) {
              dependencies.push(depMatch[2]);
            }
            j++;
          }
          
          const task: OpenSpecTask = {
            id,
            title: cleanTitle,
            description: cleanTitle,
            priority,
            status: isCompleted ? 'completed' : 'pending',
            dependencies,
            estimatedTime: 1800, // Default 30 minutes
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attempts: 0,
            tags: []
          };
          
          tasks.push(task);
        }
      }
    }

    return tasks;
  }


  /**
   * Get tasks ordered by priority
   */
  async getTasksByPriority(): Promise<OpenSpecTask[]> {
    const data = await this.loadOpenSpec();
    return data.tasks
      .filter(task => task.status === 'pending')
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get current active task
   */
  async getCurrentTask(): Promise<OpenSpecTask | null> {
    const data = await this.loadOpenSpec();
    
    if (!data.currentTask) {
      return null;
    }

    return data.tasks.find(task => task.id === data.currentTask) || null;
  }

  /**
   * Set current task
   */
  async setCurrentTask(taskId: string): Promise<void> {
    const data = await this.loadOpenSpec();
    
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    data.currentTask = taskId;
    this.data = data;
    await this.saveOpenSpec();
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: OpenSpecTask['status']): Promise<void> {
    const data = await this.loadOpenSpec();
    
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    const task = data.tasks[taskIndex];
    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (status === 'completed') {
      task.completedAt = new Date().toISOString();
      // Move to history
      data.history.push(task);
      data.tasks.splice(taskIndex, 1);
      
      // Clear current task if it was completed
      if (data.currentTask === taskId) {
        data.currentTask = undefined;
      }
    } else if (status === 'in-progress') {
      data.currentTask = taskId;
    }

    this.data = data;
    await this.saveOpenSpec();
  }

  /**
   * Mark task as complete
   */
  async markTaskComplete(taskId: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'completed');
  }

  /**
   * Add new task
   */
  async addTask(task: Omit<OpenSpecTask, 'id' | 'createdAt' | 'updatedAt' | 'attempts'>): Promise<string> {
    const data = await this.loadOpenSpec();
    
    const newTask: OpenSpecTask = {
      ...task,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0
    };

    data.tasks.push(newTask);
    this.data = data;
    await this.saveOpenSpec();

    return newTask.id;
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<OpenSpecTask | null> {
    const data = await this.loadOpenSpec();
    return data.tasks.find(t => t.id === taskId) || null;
  }

  /**
   * Get task dependencies
   */
  async getTaskDependencies(taskId: string): Promise<OpenSpecTask[]> {
    const data = await this.loadOpenSpec();
    const task = data.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return [];
    }

    return data.tasks.filter(t => task.dependencies.includes(t.id));
  }

  /**
   * Check if task dependencies are satisfied
   */
  async areDependenciesSatisfied(taskId: string): Promise<boolean> {
    const dependencies = await this.getTaskDependencies(taskId);
    return dependencies.every(dep => dep.status === 'completed');
  }

  /**
   * Get next available task
   */
  async getNextTask(): Promise<OpenSpecTask | null> {
    const pendingTasks = await this.getTasksByPriority();
    
    for (const task of pendingTasks) {
      if (await this.areDependenciesSatisfied(task.id)) {
        return task;
      }
    }

    return null;
  }

  /**
   * Increment task attempts
   */
  async incrementTaskAttempts(taskId: string): Promise<void> {
    const data = await this.loadOpenSpec();
    
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      task.attempts++;
      task.updatedAt = new Date().toISOString();
      
      this.data = data;
      await this.saveOpenSpec();
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    skipped: number;
  }> {
    const data = await this.loadOpenSpec();
    
    const stats = {
      total: data.tasks.length + data.history.length,
      pending: 0,
      inProgress: 0,
      completed: data.history.length,
      failed: 0,
      skipped: 0
    };

    for (const task of data.tasks) {
      if (task.status === 'in-progress') {
        stats.inProgress++;
      } else {
        stats[task.status]++;
      }
    }

    return stats;
  }


  /**
   * Generate ASCII dependency tree
   */
  async generateDependencyTree(): Promise<string> {
    const data = await this.loadOpenSpec();
    const lines: string[] = [];
    
    lines.push('Task Dependency Tree:');
    lines.push('');

    const visited = new Set<string>();
    const processing = new Set<string>();
    
    const buildTree = (taskId: string, depth: number = 0): void => {
      if (processing.has(taskId)) {
        lines.push(`${'  '.repeat(depth)}└─ ${taskId} (circular dependency)`);
        return;
      }
      
      if (visited.has(taskId)) {
        return;
      }
      
      processing.add(taskId);
      visited.add(taskId);
      
      const task = [...data.tasks, ...data.history].find(t => t.id === taskId);
      
      if (!task) {
        processing.delete(taskId);
        return;
      }
      
      const prefix = depth === 0 ? '├─' : '└─';
      const status = task.status === 'completed' ? '✓' : 
                    task.status === 'in-progress' ? '⚙' : 
                    task.status === 'failed' ? '✗' : '○';
      
      lines.push(`${'  '.repeat(depth)}${prefix} ${status} ${task.title} (${task.status})`);
      
      for (const depId of task.dependencies) {
        buildTree(depId, depth + 1);
      }
      
      processing.delete(taskId);
    };

    // Start with tasks that have no dependencies
    const allTasks = [...data.tasks, ...data.history];
    const rootTasks = allTasks.filter(task => task.dependencies.length === 0);
    for (const task of rootTasks) {
      buildTree(task.id);
    }

    return lines.join('\n');
  }

  /**
   * Validate dependency graph for cycles
   */
  async validateDependencyGraph(): Promise<{ valid: boolean; cycles: string[][] }> {
    const data = await this.loadOpenSpec();
    const visited = new Set<string>();
    const processing = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (taskId: string, path: string[]): void => {
      if (processing.has(taskId)) {
        // Found a cycle
        const cycleStart = path.indexOf(taskId);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(taskId)) {
        return;
      }

      visited.add(taskId);
      processing.add(taskId);

      const allTasks = [...data.tasks, ...data.history];
      const task = allTasks.find(t => t.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          dfs(depId, [...path, taskId]);
        }
      }

      processing.delete(taskId);
    };

    // Check all tasks
    const allTasks = [...data.tasks, ...data.history];
    for (const task of allTasks) {
      if (!visited.has(task.id)) {
        dfs(task.id, []);
      }
    }

    return {
      valid: cycles.length === 0,
      cycles
    };
  }

  /**
   * Get tasks that can be executed in parallel
   */
  async getParallelExecutableTasks(): Promise<OpenSpecTask[][]> {
    const data = await this.loadOpenSpec();
    const levels: OpenSpecTask[][] = [];
    const processed = new Set<string>();

    const getLevel = (tasks: OpenSpecTask[], level: number = 0): void => {
      if (tasks.length === 0) return;

      if (!levels[level]) {
        levels[level] = [];
      }

      const currentLevelTasks: OpenSpecTask[] = [];

      for (const task of tasks) {
        if (processed.has(task.id)) continue;

        const dependencies = data.tasks.filter(t => task.dependencies.includes(t.id));
        const allDependenciesProcessed = dependencies.every(dep => processed.has(dep.id));

        if (allDependenciesProcessed) {
          currentLevelTasks.push(task);
          processed.add(task.id);
        }
      }

      if (currentLevelTasks.length > 0) {
        levels[level] = currentLevelTasks;
        getLevel(data.tasks.filter(t => !processed.has(t.id)), level + 1);
      }
    };

    getLevel(data.tasks.filter(t => t.status === 'pending'));
    return levels.filter(level => level.length > 0);
  }

  /**
   * Get execution order respecting dependencies
   */
  async getExecutionOrder(): Promise<OpenSpecTask[]> {
    const parallelLevels = await this.getParallelExecutableTasks();
    const executionOrder: OpenSpecTask[] = [];

    for (const level of parallelLevels) {
      executionOrder.push(...level);
    }

    return executionOrder;
  }

  /**
   * Check if task can be started (dependencies satisfied)
   */
  async canStartTask(taskId: string): Promise<boolean> {
    const dependencies = await this.getTaskDependencies(taskId);
    return dependencies.every(dep => dep.status === 'completed');
  }

  /**
   * Get blocking tasks (tasks that block the given task)
   */
  async getBlockingTasks(taskId: string): Promise<OpenSpecTask[]> {
    const data = await this.loadOpenSpec();
    const task = data.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return [];
    }

    return data.tasks.filter(t => 
      task.dependencies.includes(t.id) && t.status !== 'completed'
    );
  }
}

/**
 * Create a new OpenSpecManager instance
 */
export function createOpenSpecManager(projectRoot: string): OpenSpecManager {
  return new OpenSpecManager(projectRoot);
}