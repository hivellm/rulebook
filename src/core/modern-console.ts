import blessed from 'blessed';
import { createOpenSpecManager } from './openspec-manager.js';
import type { OpenSpecTask } from '../types.js';
import type { AgentManager } from './agent-manager.js';

export interface ModernConsoleOptions {
  projectRoot: string;
  refreshInterval?: number;
  agentManager?: AgentManager;
}

interface ActivityLogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'tool';
  message: string;
}

/**
 * Simplified Progress-Focused Modern Console
 * New UI: Active Tasks + Progress Bar + Activity Logs
 */
export class ModernConsole {
  private screen: blessed.Widgets.Screen;
  private openspecManager: ReturnType<typeof createOpenSpecManager>;
  private isRunning = false;

  // UI Components
  private headerBox!: blessed.Widgets.BoxElement;
  private progressBox!: blessed.Widgets.BoxElement;
  private logsBox!: blessed.Widgets.BoxElement;
  private statusBar!: blessed.Widgets.BoxElement;

  // Data
  private tasks: OpenSpecTask[] = [];
  private history: OpenSpecTask[] = [];
  private activityLogs: ActivityLogEntry[] = [];
  private agentManager?: AgentManager;
  private isAgentRunning = false;

  // Animation state
  private animationFrame = 0;
  private animationInterval?: NodeJS.Timeout;

  constructor(options: ModernConsoleOptions) {
    this.agentManager = options.agentManager;

    // Use the same openspecManager as the agent to avoid loading different tasks
    if (this.agentManager) {
      // Get the openspecManager from agentManager (we'll need to expose it)
      this.openspecManager = createOpenSpecManager(options.projectRoot);
    } else {
      this.openspecManager = createOpenSpecManager(options.projectRoot);
    }

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Rulebook Watcher',
      fullUnicode: true,
      dockBorders: true,
      autoPadding: true,
      warnings: false,
    });

    this.setupUI();
    this.setupEventHandlers();
  }

  private setupUI(): void {
    // Header (3 lines)
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content:
        '{center}{bold}{blue-fg}🤖 RULEBOOK WATCHER{/blue-fg}{/bold}                          {gray-fg}[F10 Exit]{/gray-fg}{/center}',
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true,
      },
      border: {
        type: 'line' as const,
        fg: 4, // blue
      },
    });

    // Progress Bar (5 lines)
    this.progressBox = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: 5,
      label: ' {bold}📊 PROGRESS{/bold} ',
      tags: true,
      style: {
        fg: 'white',
      },
      border: {
        type: 'line' as const,
        fg: 2, // green
      },
    });

    // Activity Logs (remaining space)
    this.logsBox = blessed.box({
      top: 8,
      left: 0,
      width: '100%',
      height: '100%-9', // Fixed height: from line 8 to status bar
      label: ' {bold}📝 ACTIVITY LOGS{/bold} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: {
          bg: 'black',
          ch: '░',
        },
        style: {
          inverse: false,
          fg: 'blue',
          bg: 'black',
          bold: true,
        },
      },
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: 'white',
        bg: 'black',
      },
    });

    // Status Bar (1 line)
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ' Press F10 or Ctrl+C to exit',
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white',
      },
    });

    // Add to screen
    this.screen.append(this.headerBox);
    this.screen.append(this.progressBox);
    this.screen.append(this.logsBox);
    this.screen.append(this.statusBar);

    this.screen.render();
  }

  private setupEventHandlers(): void {
    // Exit on F10 or Ctrl+C
    this.screen.key(['f10', 'C-c'], async () => {
      await this.stop();
    });

    // Start agent on 'A' key
    this.screen.key(['a', 'A'], async () => {
      if (!this.isAgentRunning && this.agentManager) {
        this.logActivity('info', 'Starting autonomous agent...');
        this.isAgentRunning = true;
        this.updateStatusBar();

        try {
          await this.agentManager.startAgent({
            tool: 'cursor-agent',
            maxIterations: 10,
            watchMode: false,
            onLog: (type, message) => {
              this.logActivity(type, message);
            },
            onTasksReloaded: (tasks) => {
              // Update tasks list with the ones agent loaded
              this.tasks = tasks;
              this.logActivity(
                'info',
                `[DEBUG] Watcher updated with ${tasks.length} tasks from agent`
              );
              if (tasks.length > 0) {
                this.logActivity(
                  'info',
                  `[DEBUG] First task: ${tasks[0].id} - ${tasks[0].title.substring(0, 50)}`
                );
              }
              this.render();
            },
            onTaskStatusChange: async (taskId, status) => {
              // Update task locally (don't reload from disk since changes aren't saved there yet)
              const task = this.tasks.find((t) => t.id === taskId);

              // Debug log
              this.logActivity('info', `🔄 Status change: ${taskId.slice(0, 8)}... -> ${status}`);

              if (task) {
                // Update task status
                task.status = status as OpenSpecTask['status'];

                // Update metadata
                if (status === 'in-progress') {
                  if (!task.metadata) task.metadata = {};
                  task.metadata.startedAt = new Date().toISOString();
                  this.logActivity('info', `▶️  Task started: ${task.title}`);
                } else if (status === 'completed') {
                  // Add to history before removing from active list
                  task.completedAt = new Date().toISOString();
                  this.history.push(task);

                  // Remove completed task from active list
                  this.tasks = this.tasks.filter((t) => t.id !== taskId);
                  this.logActivity('success', `✅ Task completed: ${task.title}`);
                } else if (status === 'failed') {
                  this.logActivity('error', `❌ Task failed: ${task.title}`);
                }

                // Force render to show changes
                this.render();
              } else {
                this.logActivity('warning', `⚠️  Task ${taskId.slice(0, 8)}... not found in list`);
              }
            },
          });

          this.logActivity('success', 'Agent completed successfully');
        } catch (error) {
          this.logActivity('error', `Agent failed: ${error}`);
        } finally {
          this.isAgentRunning = false;
          this.updateStatusBar();
          await this.refreshTasks();
        }
      } else if (this.isAgentRunning) {
        this.logActivity('warning', 'Agent is already running');
      } else {
        this.logActivity('error', 'Agent manager not initialized');
      }
    });

    // Refresh on 'R' key
    this.screen.key(['r', 'R'], async () => {
      this.logActivity('info', 'Refreshing tasks...');
      await this.refreshTasks();
    });

    // Focus logs box for scrolling
    this.logsBox.focus();
  }

  /**
   * Update status bar
   */
  private updateStatusBar(): void {
    const agentStatus = this.isAgentRunning ? '{green-fg}Agent Running{/green-fg}' : '';
    this.statusBar.setContent(
      ` Press F10 or Ctrl+C to exit | Press A to start agent | Press R to refresh ${agentStatus}`
    );
    this.screen.render();
  }

  /**
   * Refresh tasks from OpenSpec
   */
  private async refreshTasks(): Promise<void> {
    try {
      const data = await this.openspecManager.loadOpenSpec();
      this.tasks = data.tasks;
      this.history = data.history;
      this.render();
    } catch (error) {
      this.logActivity('error', `Failed to refresh tasks: ${error}`);
    }
  }

  /**
   * Get progress information
   */
  private getProgressInfo(): {
    completed: number;
    total: number;
    percentage: number;
    color: string;
  } {
    // Include history in progress calculation
    const allTasks = [...this.tasks, ...this.history];
    const completed = this.history.length; // History contains all completed tasks
    const total = allTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Color based on progress
    let color = 'green';
    if (percentage < 50) color = 'red';
    else if (percentage < 75) color = 'yellow';

    return { completed, total, percentage, color };
  }

  /**
   * Get loading frame for spinner animation
   */
  private getLoadingFrame(): string {
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    return spinnerFrames[this.animationFrame % spinnerFrames.length];
  }

  /**
   * Start animation loop
   */
  private startAnimation(): void {
    if (this.animationInterval) return;

    // 12.5 fps = 80ms interval
    this.animationInterval = setInterval(() => {
      this.animationFrame++;
      this.render();
    }, 80);
  }

  /**
   * Stop animation loop
   */
  private stopAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = undefined;
    }
  }

  /**
   * Render progress bar
   */
  private renderProgressBar(): void {
    const { completed, total, percentage, color } = this.getProgressInfo();

    // Calculate bar width (screen width - borders - padding)
    const screenWidth = this.screen.width;
    const barWidth = typeof screenWidth === 'number' ? Math.max(40, screenWidth - 20) : 40;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);

    const bar = `\n  {${color}-fg}${filled}{/}${empty} {bold}{white-fg}${percentage}%{/} {gray-fg}(${completed}/${total}){/}\n`;

    this.progressBox.setContent(bar);
  }

  /**
   * Render active tasks with loading indicators
   */
  private renderActiveTasks(): void {
    const activeTasks = this.tasks.filter((t) => t.status === 'in-progress').slice(0, 5);

    if (activeTasks.length === 0) {
      return;
    }

    const spinner = this.getLoadingFrame();
    const now = new Date();

    const taskLines = activeTasks.map((task) => {
      let duration = '';
      if (task.metadata?.startedAt) {
        const startTime = new Date(task.metadata.startedAt);
        const diffMs = now.getTime() - startTime.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);

        if (diffMinutes > 0) {
          duration = ` (${diffMinutes}m ${diffSeconds % 60}s)`;
        } else {
          duration = ` (${diffSeconds}s)`;
        }
      }

      // Truncate title if too long
      const maxTitleLength = 50;
      let title = task.title;
      if (title.length > maxTitleLength) {
        title = title.substring(0, maxTitleLength - 3) + '...';
      }

      return `  {cyan-fg}${spinner}{/} {bold}${title}{/}${duration}`;
    });

    const content = `\n{green-fg}Active Tasks:{/}\n${taskLines.join('\n')}\n`;

    // Update progress box to include active tasks
    const progressInfo = this.getProgressInfo();
    const screenWidth = this.screen.width;
    const barWidth = typeof screenWidth === 'number' ? Math.max(40, screenWidth - 20) : 40;
    const filledWidth = Math.round((progressInfo.percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);
    const bar = `\n  {${progressInfo.color}-fg}${filled}{/}${empty} {bold}{white-fg}${progressInfo.percentage}%{/} {gray-fg}(${progressInfo.completed}/${progressInfo.total}){/}\n`;

    this.progressBox.setContent(bar + content);
  }

  /**
   * Render activity logs (dynamically limited by box height)
   */
  private renderActivityLogs(): void {
    if (this.activityLogs.length === 0) {
      this.logsBox.setContent('\n  {gray-fg}No activity yet{/gray-fg}');
      return;
    }

    const LOG_ICONS = {
      success: '{green-fg}✓{/}',
      info: '{blue-fg}i{/}',
      warning: '{yellow-fg}!{/}',
      error: '{red-fg}✗{/}',
      tool: '{cyan-fg}›{/}',
    };

    // Calculate how many logs fit in the box (height - 2 for padding)
    const boxHeight = this.logsBox.height;
    const maxLogs = typeof boxHeight === 'number' ? Math.max(10, boxHeight - 2) : 20;

    // Get terminal width to truncate long messages
    const termWidth = typeof this.screen.width === 'number' ? this.screen.width : 80;
    const maxMessageWidth = termWidth - 15; // Reserve space for timestamp and icon

    const lines = this.activityLogs
      .slice(-maxLogs) // Show only what fits
      .map((entry) => {
        const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
        const icon = LOG_ICONS[entry.type];

        // Truncate message if too long
        let message = entry.message;
        if (message.length > maxMessageWidth) {
          message = message.substring(0, maxMessageWidth - 3) + '...';
        }

        return `{gray-fg}[${time}]{/} ${icon} ${message}`;
      });

    this.logsBox.setContent(lines.join('\n'));

    // Auto-scroll to bottom
    this.logsBox.setScrollPerc(100);

    // Force screen render
    this.screen.render();
  }

  /**
   * Log activity
   */
  public logActivity(type: ActivityLogEntry['type'], message: string): void {
    this.activityLogs.push({
      timestamp: new Date(),
      type,
      message,
    });

    // Keep only last 100 entries in memory
    if (this.activityLogs.length > 100) {
      this.activityLogs = this.activityLogs.slice(-100);
    }

    this.render();
  }

  /**
   * Mark task as completed and remove from list
   */
  public markTaskCompleted(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'completed';
      this.logActivity('success', `Task completed: ${task.title}`);

      // Remove from active tasks
      this.tasks = this.tasks.filter((t) => t.id !== taskId);

      this.render();
    }
  }

  /**
   * Mark task as in progress
   */
  public markTaskInProgress(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'in-progress';
      if (!task.metadata) task.metadata = {};
      task.metadata.startedAt = new Date().toISOString();

      this.logActivity('info', `Task started: ${task.title}`);
      this.render();
    }
  }

  /**
   * Render all components
   */
  private render(): void {
    this.renderProgressBar();
    this.renderActiveTasks();
    this.renderActivityLogs();

    // Manage animation based on active tasks
    const hasActiveTasks = this.tasks.some((t) => t.status === 'in-progress');
    if (hasActiveTasks && !this.animationInterval) {
      this.startAnimation();
    } else if (!hasActiveTasks && this.animationInterval) {
      this.stopAnimation();
    }

    this.screen.render();
  }

  /**
   * Start watching
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      await this.openspecManager.initialize();
      const data = await this.openspecManager.loadOpenSpec();
      this.tasks = data.tasks;
      this.history = data.history;

      // Debug: Log loaded task IDs
      this.logActivity(
        'info',
        `[DEBUG] Loaded ${this.tasks.length} active tasks and ${this.history.length} completed`
      );
      this.tasks.slice(0, 3).forEach((t) => {
        this.logActivity('info', `  - ${t.id} (${t.status}): ${t.title.substring(0, 50)}`);
      });

      this.logActivity('info', 'Watcher started');
      this.updateStatusBar();
      this.render();
    } catch (error) {
      this.logActivity('error', `Failed to start: ${error}`);
      throw error;
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logActivity('info', 'Stopping watcher...');

    // Stop animation
    this.stopAnimation();

    // Stop agent first if running
    if (this.isAgentRunning && this.agentManager) {
      this.logActivity('info', 'Stopping agent...');
      try {
        await this.agentManager.stop();
        this.logActivity('success', 'Agent stopped');
      } catch (error) {
        this.logActivity('error', `Failed to stop agent: ${error}`);
      }
    }

    this.isRunning = false;

    this.screen.destroy();
    process.exit(0);
  }
}

/**
 * Factory function
 */
export function createModernConsole(options: ModernConsoleOptions): ModernConsole {
  return new ModernConsole(options);
}
